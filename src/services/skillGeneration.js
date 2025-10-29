const Handlebars = require('handlebars');
const JSZip = require('jszip');
const dbConnection = require('../db/database');

// Skill templates for different content types
const TEMPLATES = {
  copywriting: {
    skillMd: `# {{skillName}} Copywriting Skill

## Description
{{description}}

## Core Copywriting Framework

### Big Idea
{{extractedData.core.bigIdea}}

### Hook Patterns
{{extractedData.core.hook}}

### Problem/Pain Points
{{extractedData.core.problemPain}}

### Enemy/Villain
{{extractedData.core.enemyVillain}}

### Promise
{{extractedData.core.promise}}

### Mechanism
{{extractedData.core.mechanism}}

### Proof Elements
{{#if extractedData.core.proof}}
{{#each extractedData.core.proof}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.core.proof}}
{{/if}}

### Offer Structure
{{extractedData.core.offer}}

### Call to Action
{{extractedData.core.cta}}

## Style Guide

### Tone & Voice
{{extractedData.style.toneVoice}}

### Psychological Triggers
{{#if extractedData.style.psychologicalTriggers}}
{{#each extractedData.style.psychologicalTriggers}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.style.psychologicalTriggers}}
{{/if}}

### Emotional Tone
{{extractedData.style.emotionalTone}}

## Structure & Patterns

### Sentence Structure
**Average Length:** {{extractedData.structure.sentenceStructure.averageLength}} words

**Patterns:**
{{#if extractedData.structure.sentenceStructure.patterns}}
{{#each extractedData.structure.sentenceStructure.patterns}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.structure.sentenceStructure.patterns}}
{{/if}}

### Copy Cadence
{{extractedData.structure.copyCadence}}

### Paragraph Flow
{{extractedData.structure.paragraphFlow}}

### Formatting Patterns
{{#if extractedData.structure.formattingPatterns}}
{{#each extractedData.structure.formattingPatterns}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.structure.formattingPatterns}}
{{/if}}

### Narrative Flow
{{extractedData.structure.narrativeFlow}}

## Language Style

### Language Style
{{extractedData.language.languageStyle}}

### Signature Phrases
{{#if extractedData.language.signaturePhrases}}
{{#each extractedData.language.signaturePhrases}}
- "{{this}}"
{{/each}}
{{else}}
{{extractedData.language.signaturePhrases}}
{{/if}}

### Power Words
{{#if extractedData.language.powerWords}}
{{#each extractedData.language.powerWords}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.language.powerWords}}
{{/if}}

## Usage Instructions

When writing copy using this skill:
1. Start with the hook pattern identified above
2. Address the core pain points
3. Use the psychological triggers throughout
4. Follow the narrative flow structure
5. End with the call to action pattern

## References

See the \`references/\` folder for:
- Detailed copywriting practices
- Sentence structure patterns
- Complete examples`,

    practicesMd: `# Copywriting Practices

## Sentence Structure
**Average Length:** {{extractedData.structure.sentenceStructure.averageLength}} words

**Patterns:**
{{#if extractedData.structure.sentenceStructure.patterns}}
{{#each extractedData.structure.sentenceStructure.patterns}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.structure.sentenceStructure.patterns}}
{{/if}}

**Variety:** {{extractedData.structure.sentenceStructure.variety}}

## Copy Cadence
{{extractedData.structure.copyCadence}}

## Formatting Patterns
{{#if extractedData.structure.formattingPatterns}}
{{#each extractedData.structure.formattingPatterns}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.structure.formattingPatterns}}
{{/if}}

## Narrative Flow
{{extractedData.structure.narrativeFlow}}`,

    structureMd: `# Copy Structure & Flow

## Language Style
{{extractedData.language.languageStyle}}

## Signature Phrases
{{#if extractedData.language.signaturePhrases}}
{{#each extractedData.language.signaturePhrases}}
- "{{this}}"
{{/each}}
{{else}}
{{extractedData.language.signaturePhrases}}
{{/if}}

## Power Words
{{#if extractedData.language.powerWords}}
{{#each extractedData.language.powerWords}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.language.powerWords}}
{{/if}}

## Paragraph Flow
{{extractedData.structure.paragraphFlow}}`,

    examplesMd: `# Example Analysis

## Original Content Sample
This skill was extracted from content with the following characteristics:

**Tone:** {{extractedData.style.toneVoice}}
**Flow:** {{extractedData.structure.narrativeFlow}}
**Key Hook:** {{extractedData.core.hook}}

## Application Example

When applying this skill, mirror these patterns:
- Use similar psychological triggers
- Match the sentence cadence
- Follow the narrative structure
- Employ the signature phrases naturally`
  },

  process: {
    skillMd: `# {{skillName}} Process Skill

## Description
{{description}}

## Workflow Overview

### Process Steps
{{#if extractedData.workflow.steps}}
{{#each extractedData.workflow.steps}}
#### {{name}}
- **Description:** {{description}}
- **Duration:** {{duration}}
- **Owner:** {{owner}}
{{/each}}
{{else}}
{{extractedData.workflow.steps}}
{{/if}}

### Decision Points
{{#if extractedData.workflow.decisionPoints}}
{{#each extractedData.workflow.decisionPoints}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.workflow.decisionPoints}}
{{/if}}

### Dependencies
{{#if extractedData.workflow.dependencies}}
{{#each extractedData.workflow.dependencies}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.workflow.dependencies}}
{{/if}}

### Critical Path
{{extractedData.workflow.criticalPath}}

## Resources Required

### Tools Required
{{#if extractedData.resources.toolsRequired}}
{{#each extractedData.resources.toolsRequired}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.resources.toolsRequired}}
{{/if}}

### Skills Needed
{{#if extractedData.resources.skillsNeeded}}
{{#each extractedData.resources.skillsNeeded}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.resources.skillsNeeded}}
{{/if}}

### People Involved
{{#if extractedData.resources.peopleInvolved}}
{{#each extractedData.resources.peopleInvolved}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.resources.peopleInvolved}}
{{/if}}

### Documents Needed
{{#if extractedData.resources.documentsNeeded}}
{{#each extractedData.resources.documentsNeeded}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.resources.documentsNeeded}}
{{/if}}

## Quality & Risk Management

### Success Metrics
{{#if extractedData.quality.successMetrics}}
{{#each extractedData.quality.successMetrics}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.quality.successMetrics}}
{{/if}}

### Quality Checks
{{#if extractedData.quality.qualityChecks}}
{{#each extractedData.quality.qualityChecks}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.quality.qualityChecks}}
{{/if}}

### Common Pitfalls
{{#if extractedData.quality.commonPitfalls}}
{{#each extractedData.quality.commonPitfalls}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.quality.commonPitfalls}}
{{/if}}

### Troubleshooting
{{#if extractedData.quality.troubleshooting}}
{{#each extractedData.quality.troubleshooting}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.quality.troubleshooting}}
{{/if}}

## Context

### When to Use
{{extractedData.context.when}}

### Frequency
{{extractedData.context.frequency}}

### Variations
{{#if extractedData.context.variations}}
{{#each extractedData.context.variations}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.context.variations}}
{{/if}}

### Dependencies
{{#if extractedData.context.dependencies}}
{{#each extractedData.context.dependencies}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.context.dependencies}}
{{/if}}`,

    practicesMd: `# Process Practices

## Workflow Management
Follow the defined steps in sequence, paying attention to dependencies and critical path items.

## Quality Assurance
Implement the quality checks at each stage to ensure process integrity.

## Risk Mitigation
Be aware of common pitfalls and have troubleshooting procedures ready.`,

    structureMd: `# Process Structure

## Step Dependencies
{{#if extractedData.workflow.dependencies}}
{{#each extractedData.workflow.dependencies}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.workflow.dependencies}}
{{/if}}

## Critical Path
{{extractedData.workflow.criticalPath}}`,

    examplesMd: `# Process Examples

## Typical Execution
This process skill was extracted from content describing a proven workflow.

## Variations
{{#if extractedData.context.variations}}
{{#each extractedData.context.variations}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.context.variations}}
{{/if}}`
  },

  technical: {
    skillMd: `# {{skillName}} Technical Skill

## Description
{{description}}

## Core Concepts

### Main Concepts
{{#if extractedData.concepts.mainConcepts}}
{{#each extractedData.concepts.mainConcepts}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.concepts.mainConcepts}}
{{/if}}

### Key Terminology
{{#if extractedData.concepts.terminology}}
{{#each extractedData.concepts.terminology}}
- **{{@key}}:** {{this}}
{{/each}}
{{else}}
{{extractedData.concepts.terminology}}
{{/if}}

### Prerequisites
{{#if extractedData.concepts.prerequisites}}
{{#each extractedData.concepts.prerequisites}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.concepts.prerequisites}}
{{/if}}

### Difficulty Level
{{extractedData.concepts.difficulty}}

## Implementation

### Design Patterns
{{#if extractedData.implementation.patterns}}
{{#each extractedData.implementation.patterns}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.implementation.patterns}}
{{/if}}

### Best Practices
{{#if extractedData.implementation.bestPractices}}
{{#each extractedData.implementation.bestPractices}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.implementation.bestPractices}}
{{/if}}

### Anti-Patterns
{{#if extractedData.implementation.antiPatterns}}
{{#each extractedData.implementation.antiPatterns}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.implementation.antiPatterns}}
{{/if}}

### Examples
{{#if extractedData.implementation.examples}}
{{#each extractedData.implementation.examples}}
#### {{scenario}}
\`\`\`
{{code}}
\`\`\`
**Explanation:** {{explanation}}
{{/each}}
{{else}}
{{extractedData.implementation.examples}}
{{/if}}

## Architecture

### Components
{{#if extractedData.architecture.components}}
{{#each extractedData.architecture.components}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.architecture.components}}
{{/if}}

### Data Flow
{{extractedData.architecture.dataFlow}}

### Integrations
{{#if extractedData.architecture.integrations}}
{{#each extractedData.architecture.integrations}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.architecture.integrations}}
{{/if}}

### Scalability Considerations
{{extractedData.architecture.scalability}}`,

    practicesMd: `# Technical Practices

## Implementation Guidelines
Follow the best practices and avoid the anti-patterns identified in the analysis.

## Code Examples
{{#if extractedData.implementation.examples}}
{{#each extractedData.implementation.examples}}
### {{scenario}}
\`\`\`
{{code}}
\`\`\`
{{explanation}}
{{/each}}
{{else}}
{{extractedData.implementation.examples}}
{{/if}}`,

    structureMd: `# Technical Structure

## Architecture Components
{{#if extractedData.architecture.components}}
{{#each extractedData.architecture.components}}
- {{this}}
{{/each}}
{{else}}
{{extractedData.architecture.components}}
{{/if}}

## Data Flow
{{extractedData.architecture.dataFlow}}`,

    examplesMd: `# Technical Examples

## Implementation Examples
{{#if extractedData.implementation.examples}}
{{#each extractedData.implementation.examples}}
### {{scenario}}
\`\`\`
{{code}}
\`\`\`
**Why it works:** {{explanation}}
{{/each}}
{{else}}
{{extractedData.implementation.examples}}
{{/if}}`
  }
};

// Register Handlebars helpers
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('join', (arr, sep) => Array.isArray(arr) ? arr.join(sep || ', ') : arr);

/**
 * Generate skill package from analysis data
 * @param {object} analysisData - Analysis result from content analysis
 * @param {string} skillName - Name for the skill
 * @param {string} skillType - Type of skill (copywriting, process, technical)
 * @param {string} description - Description of the skill
 * @param {Array<string>} tags - Tags for the skill
 * @returns {Promise<object>} Complete skill package
 */
async function generateSkill(analysisData, skillName, skillType, description, tags = []) {
  try {
    // 1. Validate inputs
    validateSkillName(skillName);
    validateSkillType(skillType);

    if (!analysisData || !analysisData.extractedData) {
      throw new Error('Invalid analysis data provided');
    }

    // 2. Prepare template data
    const templateData = {
      skillName: formatSkillName(skillName),
      description: description || generateDescription(analysisData, skillType),
      extractedData: analysisData.extractedData,
      contentType: skillType
    };

    // 3. Generate skill files from templates
    const skillFiles = generateSkillFiles(skillType, templateData);

    // 4. Calculate metadata
    const metadata = {
      tags: tags || [],
      fileCount: 1 + Object.keys(skillFiles.references).length,
      totalSize: calculateTotalSize(skillFiles),
      extractedFrom: {
        analysisId: analysisData.analysisId,
        contentType: analysisData.contentType,
        analysisDate: analysisData.timestamp,
        confidence: analysisData.confidence
      }
    };

    // 5. Save to database
    const skillId = await saveSkillToDatabase({
      name: templateData.skillName,
      description: templateData.description,
      skill_type: skillType,
      version: 1,
      main_content: skillFiles['skill.md'],
      references: JSON.stringify(skillFiles.references),
      metadata: JSON.stringify(metadata)
    });

    // 6. Create ZIP file
    const zipBuffer = await createSkillZip(skillFiles, templateData.skillName);

    // 7. Return complete skill package
    return {
      skillId,
      skillName: templateData.skillName,
      version: 1,
      files: skillFiles,
      metadata,
      zipBuffer,
      downloadUrl: `/api/skills/${skillId}/download`,
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    throw new Error(`Skill generation failed: ${error.message}`);
  }
}

/**
 * Generate skill files from templates
 * @param {string} skillType - Type of skill
 * @param {object} templateData - Data for template rendering
 * @returns {object} Generated files
 */
function generateSkillFiles(skillType, templateData) {
  const templates = TEMPLATES[skillType];

  if (!templates) {
    throw new Error(`No template found for skill type: ${skillType}`);
  }

  const files = {
    'skill.md': null,
    references: {}
  };

  // Compile and render main template
  const mainTemplate = Handlebars.compile(templates.skillMd);
  files['skill.md'] = mainTemplate(templateData);

  // Generate reference files
  if (templates.practicesMd) {
    const practicesTemplate = Handlebars.compile(templates.practicesMd);
    files.references['practices.md'] = practicesTemplate(templateData);
  }

  if (templates.structureMd) {
    const structureTemplate = Handlebars.compile(templates.structureMd);
    files.references['structure.md'] = structureTemplate(templateData);
  }

  if (templates.examplesMd) {
    const examplesTemplate = Handlebars.compile(templates.examplesMd);
    files.references['examples.md'] = examplesTemplate(templateData);
  }

  return files;
}

/**
 * Create ZIP file from skill files
 * @param {object} skillFiles - Generated skill files
 * @param {string} skillName - Name of the skill
 * @returns {Promise<Buffer>} ZIP file buffer
 */
async function createSkillZip(skillFiles, skillName) {
  const zip = new JSZip();

  // Add main skill file
  zip.file('skill.md', skillFiles['skill.md']);

  // Add references folder
  if (skillFiles.references && Object.keys(skillFiles.references).length > 0) {
    const referencesFolder = zip.folder('references');

    for (const [filename, content] of Object.entries(skillFiles.references)) {
      referencesFolder.file(filename, content);
    }
  }

  // Generate ZIP buffer
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  return zipBuffer;
}

/**
 * Save skill to database
 * @param {object} skillData - Skill data to save
 * @returns {Promise<number>} Skill ID
 */
async function saveSkillToDatabase(skillData) {
  const db = dbConnection.getConnection();
  
  const stmt = db.prepare(`
    INSERT INTO skills (name, description, skill_type, version, main_content, \`references\`, metadata)
    VALUES (@name, @description, @skill_type, @version, @main_content, @references, @metadata)
  `);

  const result = stmt.run(skillData);
  return result.lastInsertRowid;
}

/**
 * Validate skill name
 * @param {string} name - Skill name to validate
 */
function validateSkillName(name) {
  if (!name || name.length < 3) {
    throw new Error('Skill name must be at least 3 characters');
  }

  if (name.length > 50) {
    throw new Error('Skill name must be less than 50 characters');
  }

  const formatted = formatSkillName(name);
  if (!/^[a-z0-9-]+$/.test(formatted)) {
    throw new Error('Skill name must contain only lowercase letters, numbers, and hyphens');
  }

  // Check for existing skill with same name
  const db = dbConnection.getConnection();
  const existing = db.prepare('SELECT id FROM skills WHERE name = ?').get(formatted);
  if (existing) {
    throw new Error('Skill with this name already exists');
  }
}

/**
 * Validate skill type
 * @param {string} skillType - Skill type to validate
 */
function validateSkillType(skillType) {
  const validTypes = Object.keys(TEMPLATES);
  if (!validTypes.includes(skillType)) {
    throw new Error(`Invalid skill type: ${skillType}. Valid types: ${validTypes.join(', ')}`);
  }
}

/**
 * Format skill name (lowercase with hyphens)
 * @param {string} name - Name to format
 * @returns {string} Formatted name
 */
function formatSkillName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate auto description if not provided
 * @param {object} analysisData - Analysis data
 * @param {string} skillType - Type of skill
 * @returns {string} Generated description
 */
function generateDescription(analysisData, skillType) {
  const data = analysisData.extractedData;

  switch (skillType) {
    case 'copywriting':
      return `Generates ${data.style?.toneVoice || 'effective'} copy using the ${data.structure?.narrativeFlow || 'proven'} framework`;

    case 'process':
      return `Structured workflow for ${data.workflow?.steps?.[0]?.name || 'process execution'}`;

    case 'technical':
      return `Technical guide for ${data.concepts?.mainConcepts?.[0] || 'implementation'}`;

    default:
      return `Claude skill for ${skillType} tasks`;
  }
}

/**
 * Calculate total size of skill files
 * @param {object} skillFiles - Skill files
 * @returns {number} Total size in bytes
 */
function calculateTotalSize(skillFiles) {
  let totalBytes = 0;

  // Main skill file
  totalBytes += Buffer.byteLength(skillFiles['skill.md'], 'utf8');

  // Reference files
  for (const content of Object.values(skillFiles.references || {})) {
    totalBytes += Buffer.byteLength(content, 'utf8');
  }

  return totalBytes;
}

/**
 * Validate skill package
 * @param {object} skillFiles - Skill files to validate
 * @returns {object} Validation result
 */
function validateSkillPackage(skillFiles) {
  const issues = [];

  // Check main skill file
  if (!skillFiles['skill.md']) {
    issues.push('Missing skill.md file');
  } else if (skillFiles['skill.md'].length < 100) {
    issues.push('skill.md content seems too short');
  }

  // Check for valid markdown
  if (!isValidMarkdown(skillFiles['skill.md'])) {
    issues.push('skill.md contains invalid markdown');
  }

  // Check reference files
  const refCount = Object.keys(skillFiles.references || {}).length;
  if (refCount === 0) {
    issues.push('No reference files generated - skill may be incomplete');
  }

  // Check total size
  const totalSize = calculateTotalSize(skillFiles);
  if (totalSize > 1024 * 1024) {
    issues.push('Skill package is larger than 1MB - may be too verbose');
  }

  return {
    isValid: issues.length === 0,
    issues,
    packageSize: totalSize
  };
}

/**
 * Check if markdown is valid
 * @param {string} content - Markdown content
 * @returns {boolean} Whether markdown is valid
 */
function isValidMarkdown(content) {
  // Basic markdown validation
  return (
    content.includes('#') && // Has headers
    content.length > 50 && // Meaningful content
    !content.includes('{{') // No unrendered templates
  );
}

module.exports = {
  generateSkill,
  generateSkillFiles,
  createSkillZip,
  validateSkillPackage,
  formatSkillName,
  validateSkillName,
  validateSkillType,
  TEMPLATES
};
