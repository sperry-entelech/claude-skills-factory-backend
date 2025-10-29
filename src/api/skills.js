const express = require('express');
const { z } = require('zod');
const { generateSkill } = require('../services/skillGeneration');
const dbConnection = require('../db/database');

const router = express.Router();

// Validation schemas
const GenerateSkillRequestSchema = z.object({
  analysisId: z.string().uuid('Invalid analysis ID format'),
  skillName: z.string().min(3, 'Skill name must be at least 3 characters').max(50, 'Skill name must be less than 50 characters'),
  skillType: z.enum(['copywriting', 'process', 'technical']),
  description: z.string().optional(),
  tags: z.array(z.string()).optional()
});

const UpdateSkillRequestSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  description: z.string().optional(),
  mainContent: z.string().min(100, 'Content must be at least 100 characters').optional(),
  references: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

/**
 * POST /api/generate-skill
 * Generate skill from analysis
 */
router.post('/generate-skill', async (req, res) => {
  try {
    // 1. Validate request
    const validatedData = GenerateSkillRequestSchema.parse(req.body);

    // 2. Get analysis data from database
    const db = dbConnection.getConnection();
    const analysis = db.prepare(`
      SELECT analysis_result, content_type, confidence, created_at
      FROM content_analyses 
      WHERE id = ?
    `).get(validatedData.analysisId);

    if (!analysis) {
      return res.status(404).json({
        error: 'Analysis not found',
        message: 'The specified analysis ID does not exist'
      });
    }

    // 3. Reconstruct analysis data
    const analysisData = {
      analysisId: validatedData.analysisId,
      contentType: analysis.content_type,
      extractedData: JSON.parse(analysis.analysis_result),
      confidence: analysis.confidence,
      timestamp: analysis.created_at
    };

    // 4. Generate skill
    const skillPackage = await generateSkill(
      analysisData,
      validatedData.skillName,
      validatedData.skillType,
      validatedData.description,
      validatedData.tags
    );

    // 5. Return success response
    res.status(201).json({
      skillId: skillPackage.skillId,
      skillName: skillPackage.skillName,
      version: skillPackage.version,
      downloadUrl: skillPackage.downloadUrl,
      createdAt: skillPackage.createdAt,
      metadata: skillPackage.metadata
    });

  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    // Handle known errors
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Skill name conflict',
        message: error.message
      });
    }

    console.error('Skill generation error:', error);

    res.status(500).json({
      error: 'Skill generation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/skills
 * List all skills with optional filtering
 */
router.get('/skills', async (req, res) => {
  try {
    const db = dbConnection.getConnection();
    const { search, type, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT id, name, description, skill_type, version, created_at, updated_at,
             json_extract(metadata, '$.tags') as tags
      FROM skills
      WHERE 1=1
    `;
    const params = [];

    // Add search filter
    if (search) {
      query += ` AND (name LIKE ? OR description LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    // Add type filter
    if (type) {
      query += ` AND skill_type = ?`;
      params.push(type);
    }

    // Add ordering and pagination
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const skills = db.prepare(query).all(params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM skills WHERE 1=1`;
    const countParams = [];
    
    if (search) {
      countQuery += ` AND (name LIKE ? OR description LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }
    
    if (type) {
      countQuery += ` AND skill_type = ?`;
      countParams.push(type);
    }

    const { total } = db.prepare(countQuery).get(countParams);

    res.json({
      skills: skills.map(skill => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        skillType: skill.skill_type,
        version: skill.version,
        tags: skill.tags ? JSON.parse(skill.tags) : [],
        createdAt: skill.created_at,
        updatedAt: skill.updated_at
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });

  } catch (error) {
    console.error('Skills list error:', error);
    res.status(500).json({
      error: 'Failed to retrieve skills',
      message: error.message
    });
  }
});

/**
 * GET /api/skills/:id
 * Get single skill details
 */
router.get('/skills/:id', async (req, res) => {
  try {
    const db = dbConnection.getConnection();
    const skillId = parseInt(req.params.id);

    if (isNaN(skillId)) {
      return res.status(400).json({
        error: 'Invalid skill ID',
        message: 'Skill ID must be a number'
      });
    }

    const skill = db.prepare(`
      SELECT id, name, description, skill_type, version, main_content, 
             \`references\`, metadata, created_at, updated_at
      FROM skills 
      WHERE id = ?
    `).get(skillId);

    if (!skill) {
      return res.status(404).json({
        error: 'Skill not found',
        message: 'The specified skill does not exist'
      });
    }

    res.json({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      skillType: skill.skill_type,
      version: skill.version,
      mainContent: skill.main_content,
      references: JSON.parse(skill.references),
      metadata: JSON.parse(skill.metadata),
      createdAt: skill.created_at,
      updatedAt: skill.updated_at
    });

  } catch (error) {
    console.error('Get skill error:', error);
    res.status(500).json({
      error: 'Failed to retrieve skill',
      message: error.message
    });
  }
});

/**
 * PUT /api/skills/:id
 * Update skill
 */
router.put('/skills/:id', async (req, res) => {
  try {
    const db = dbConnection.getConnection();
    const skillId = parseInt(req.params.id);

    if (isNaN(skillId)) {
      return res.status(400).json({
        error: 'Invalid skill ID',
        message: 'Skill ID must be a number'
      });
    }

    // Validate request
    const validatedData = UpdateSkillRequestSchema.parse(req.body);

    // Check if skill exists
    const existingSkill = db.prepare('SELECT id, version FROM skills WHERE id = ?').get(skillId);
    if (!existingSkill) {
      return res.status(404).json({
        error: 'Skill not found',
        message: 'The specified skill does not exist'
      });
    }

    // Start transaction
    const updateSkill = db.transaction(() => {
      // Save current version to history
      const currentSkill = db.prepare(`
        SELECT version, main_content, \`references\`, metadata
        FROM skills WHERE id = ?
      `).get(skillId);

      db.prepare(`
        INSERT INTO skill_versions (skill_id, version, main_content, \`references\`, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).run(skillId, currentSkill.version, currentSkill.main_content, 
              currentSkill.references, currentSkill.metadata);

      // Update main skill
      const updateFields = [];
      const updateParams = [];

      if (validatedData.name) {
        updateFields.push('name = ?');
        updateParams.push(validatedData.name);
      }
      if (validatedData.description) {
        updateFields.push('description = ?');
        updateParams.push(validatedData.description);
      }
      if (validatedData.mainContent) {
        updateFields.push('main_content = ?');
        updateParams.push(validatedData.mainContent);
      }
      if (validatedData.references) {
        updateFields.push('`references` = ?');
        updateParams.push(JSON.stringify(validatedData.references));
      }
      if (validatedData.tags) {
        const metadata = JSON.parse(currentSkill.metadata);
        metadata.tags = validatedData.tags;
        updateFields.push('metadata = ?');
        updateParams.push(JSON.stringify(metadata));
      }

      updateFields.push('version = version + 1');
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateParams.push(skillId);

      const updateQuery = `UPDATE skills SET ${updateFields.join(', ')} WHERE id = ?`;
      db.prepare(updateQuery).run(...updateParams);

      return db.prepare('SELECT version FROM skills WHERE id = ?').get(skillId);
    });

    const result = updateSkill();

    res.json({
      id: skillId,
      version: result.version,
      message: 'Skill updated successfully'
    });

  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    console.error('Update skill error:', error);
    res.status(500).json({
      error: 'Failed to update skill',
      message: error.message
    });
  }
});

/**
 * DELETE /api/skills/:id
 * Delete skill
 */
router.delete('/skills/:id', async (req, res) => {
  try {
    const db = dbConnection.getConnection();
    const skillId = parseInt(req.params.id);

    if (isNaN(skillId)) {
      return res.status(400).json({
        error: 'Invalid skill ID',
        message: 'Skill ID must be a number'
      });
    }

    // Check if skill exists
    const skill = db.prepare('SELECT id, name FROM skills WHERE id = ?').get(skillId);
    if (!skill) {
      return res.status(404).json({
        error: 'Skill not found',
        message: 'The specified skill does not exist'
      });
    }

    // Delete skill (cascades to versions and usage)
    db.prepare('DELETE FROM skills WHERE id = ?').run(skillId);

    res.json({
      message: 'Skill deleted successfully',
      deletedSkill: {
        id: skillId,
        name: skill.name
      }
    });

  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({
      error: 'Failed to delete skill',
      message: error.message
    });
  }
});

/**
 * GET /api/skills/:id/download
 * Download skill as ZIP file
 */
router.get('/skills/:id/download', async (req, res) => {
  try {
    const db = dbConnection.getConnection();
    const skillId = parseInt(req.params.id);

    if (isNaN(skillId)) {
      return res.status(400).json({
        error: 'Invalid skill ID',
        message: 'Skill ID must be a number'
      });
    }

    // Get skill data
    const skill = db.prepare(`
      SELECT name, main_content, \`references\`
      FROM skills 
      WHERE id = ?
    `).get(skillId);

    if (!skill) {
      return res.status(404).json({
        error: 'Skill not found',
        message: 'The specified skill does not exist'
      });
    }

    // Create skill files
    const skillFiles = {
      'skill.md': skill.main_content,
      references: JSON.parse(skill.references)
    };

    // Generate ZIP
    const { createSkillZip } = require('../services/skillGeneration');
    const zipBuffer = await createSkillZip(skillFiles, skill.name);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${skill.name}.zip"`);
    res.setHeader('Content-Length', zipBuffer.length);

    res.send(zipBuffer);

  } catch (error) {
    console.error('Download skill error:', error);
    res.status(500).json({
      error: 'Failed to download skill',
      message: error.message
    });
  }
});

module.exports = router;
