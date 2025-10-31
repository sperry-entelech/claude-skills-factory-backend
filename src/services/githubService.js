/**
 * GitHub Service
 * Handles publishing skills to GitHub repositories
 */

/**
 * Create a new GitHub repository
 * @param {string} token - GitHub personal access token
 * @param {string} repoName - Repository name
 * @param {string} description - Repository description
 * @param {boolean} isPrivate - Whether repository should be private
 * @returns {Promise<object>} Repository data
 */
async function createRepository(token, repoName, description, isPrivate = false) {
  try {
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Skills-Factory-Backend'
      },
      body: JSON.stringify({
        name: repoName,
        description: description || `Claude skill: ${repoName}`,
        private: isPrivate,
        auto_init: false,
        license_template: null
      })
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle repo already exists
      if (response.status === 422 && error.message?.includes('already exists')) {
        throw new Error(`Repository ${repoName} already exists`);
      }

      throw new Error(`GitHub API error: ${error.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('already exists')) {
      throw error;
    }
    throw new Error(`Failed to create repository: ${error.message}`);
  }
}

/**
 * Create or update file in repository
 * @param {string} token - GitHub personal access token
 * @param {string} owner - Repository owner (username)
 * @param {string} repo - Repository name
 * @param {string} path - File path in repository
 * @param {string} content - File content (base64 encoded)
 * @param {string} message - Commit message
 * @param {string} branch - Branch name (default: main)
 * @returns {Promise<object>} Commit data
 */
async function createOrUpdateFile(token, owner, repo, path, content, message, branch = 'main') {
  try {
    // Check if file exists
    let sha = null;
    try {
      const getResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Skills-Factory-Backend'
          }
        }
      );

      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
      }
    } catch (e) {
      // File doesn't exist, that's fine
    }

    // Encode content to base64
    const contentBuffer = Buffer.from(content, 'utf8');
    const encodedContent = contentBuffer.toString('base64');

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Skills-Factory-Backend'
        },
        body: JSON.stringify({
          message: message,
          content: encodedContent,
          branch: branch,
          ...(sha ? { sha: sha } : {})
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub API error: ${error.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to create/update file: ${error.message}`);
  }
}

/**
 * Publish skill to GitHub repository
 * @param {string} token - GitHub personal access token
 * @param {string} skillName - Name of the skill (used for repo name)
 * @param {string} description - Skill description
 * @param {object} skillFiles - Skill files { 'SKILL.md': content, references: {...} }
 * @param {boolean} isPrivate - Whether repository should be private
 * @param {string} owner - GitHub username/org (optional, defaults to token owner)
 * @returns {Promise<object>} Repository URL and metadata
 */
async function publishSkillToGitHub(token, skillName, description, skillFiles, isPrivate = false, owner = null) {
  try {
    // Format repository name
    const repoName = skillName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');

    // Get owner from token if not provided
    if (!owner) {
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Skills-Factory-Backend'
        }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to authenticate with GitHub');
      }

      const userData = await userResponse.json();
      owner = userData.login;
    }

    // Create repository
    const repo = await createRepository(token, repoName, description, isPrivate);
    
    // Create README.md
    const readmeContent = `# ${skillName}

${description}

## Installation

Install this skill using [OpenSkills](https://github.com/numman-ali/openskills):

\`\`\`bash
openskills install ${owner}/${repoName}
\`\`\`

Or manually:

1. Clone this repository
2. Copy the skill folder to \`.claude/skills/${skillName}/`
3. Add to your \`AGENTS.md\` file

## Usage

This skill follows the SKILL.md format and is compatible with:
- Claude Code
- OpenSkills
- Any agent that supports the SKILL.md format

## Structure

- \`SKILL.md\` - Main skill instructions
- \`references/\` - Supporting documentation
- \`scripts/\` - Helper scripts (if any)
- \`assets/\` - Templates and resources (if any)
`;

    await createOrUpdateFile(
      token,
      owner,
      repoName,
      'README.md',
      readmeContent,
      'Initial commit: Add README',
      'main'
    );

    // Add SKILL.md
    await createOrUpdateFile(
      token,
      owner,
      repoName,
      'SKILL.md',
      skillFiles['SKILL.md'],
      'Add SKILL.md',
      'main'
    );

    // Add reference files
    for (const [filename, content] of Object.entries(skillFiles.references || {})) {
      await createOrUpdateFile(
        token,
        owner,
        repoName,
        `references/${filename}`,
        content,
        `Add reference: ${filename}`,
        'main'
      );
    }

    // Create empty scripts/ and assets/ directories (by adding .gitkeep files)
    await createOrUpdateFile(
      token,
      owner,
      repoName,
      'scripts/.gitkeep',
      '',
      'Add scripts directory',
      'main'
    ).catch(() => {}); // Ignore errors

    await createOrUpdateFile(
      token,
      owner,
      repoName,
      'assets/.gitkeep',
      '',
      'Add assets directory',
      'main'
    ).catch(() => {}); // Ignore errors

    return {
      success: true,
      repositoryUrl: repo.html_url,
      repositoryName: repo.full_name,
      cloneUrl: repo.clone_url,
      installCommand: `openskills install ${repo.full_name}`
    };

  } catch (error) {
    throw new Error(`Failed to publish skill to GitHub: ${error.message}`);
  }
}

module.exports = {
  createRepository,
  createOrUpdateFile,
  publishSkillToGitHub
};

