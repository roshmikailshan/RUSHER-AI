import express from 'express';
import axios from 'axios';

const router = express.Router();
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const REPLICATE_API_URL = 'https://api.replicate.com/v1';

router.post('/predictions', async (req, res) => {
  try {
    if (!REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN is not configured');
    }

    const response = await axios.post(
      `${REPLICATE_API_URL}/predictions`,
      {
        version: "2389224e115448d9a77c07d7d45672b3f0aa45acacf1c5bcf51857ac295e3aec",
        input: {
          prompt: req.body.prompt,
          negative_prompt: req.body.negativePrompt,
          width: req.body.width || 512,
          height: req.body.height || 512,
          num_outputs: req.body.num_outputs || 1,
          scheduler: req.body.scheduler || "DPMSolverMultistep",
          num_inference_steps: req.body.num_inference_steps || 20,
          guidance_scale: req.body.guidance_scale || 7.5,
          loras: req.body.loras || [],
          disable_safety_checker: true
        }
      },
      {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 402) {
        res.status(402).json({
          error: 'Your Replicate account requires payment or has insufficient credits. Please visit https://replicate.com to check your account status.'
        });
        return;
      }
      res.status(error.response?.status || 500).json({
        error: error.response?.data?.error || error.message
      });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/predictions/:id', async (req, res) => {
  try {
    if (!REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN is not configured');
    }

    const response = await axios.get(
      `${REPLICATE_API_URL}/predictions/${req.params.id}`,
      {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        error: error.response?.data?.error || error.message
      });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 