const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN;

app.get('/api/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ status: "ok", message: "Backend ativo!" });
});

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ status: "ok", message: "Backend ativo!" });
});

app.post('/api/videos', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  const { prompt } = req.body;

  if (!prompt || prompt.length < 10) {
    return res.status(400).json({ error: "O prompt deve ter pelo menos 10 caracteres." });
  }

  if (!HF_TOKEN) {
    return res.status(500).json({ error: "Token da Hugging Face não configurado no Render." });
  }

  try {
    // Configura um tempo limite de 120 segundos para a requisição da IA
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const response = await fetch("https://api-inference.huggingface.co/models/damo-vilab/text-to-video-ms-1.7b", {
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ inputs: prompt }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok || !contentType.includes("video")) {
      const errText = await response.text();
      return res.status(400).json({ error: "Hugging Face (Aguarde aquecimento do modelo): " + errText.slice(0, 150) });
    }

    const videoBuffer = await response.arrayBuffer();
    const base64Video = Buffer.from(videoBuffer).toString('base64');
    const dataUrl = `data:video/mp4;base64,${base64Video}`;

    return res.status(200).json({
      id: "job_" + Date.now(),
      status: "completed",
      progress: 100,
      videoUrl: dataUrl,
      url: dataUrl
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: "A IA demorou muito para responder. Tente novamente em instantes." });
    }
    return res.status(500).json({ error: "Erro interno: " + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
