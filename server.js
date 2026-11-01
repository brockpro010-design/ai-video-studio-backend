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
    // Usando o modelo ModelScope text-to-video otimizado
    const response = await fetch("https://api-inference.huggingface.co/models/damo-vilab/text-to-video-ms-1.7b", {
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ inputs: prompt }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ error: "Hugging Face: " + responseText });
    }

    // Verifica se a resposta é um binário de vídeo ou JSON de erro/carregamento
    if (responseText.startsWith("{") || responseText.startsWith("[")) {
      try {
        const jsonErr = JSON.parse(responseText);
        if (jsonErr.error) {
          return res.status(400).json({ error: "IA: " + jsonErr.error });
        }
      } catch (e) {}
    }

    const videoBuffer = Buffer.from(responseText, 'binary');
    const base64Video = videoBuffer.toString('base64');
    const dataUrl = `data:video/mp4;base64,${base64Video}`;

    return res.status(200).json({
      id: "job_" + Date.now(),
      status: "completed",
      progress: 100,
      videoUrl: dataUrl,
      url: dataUrl
    });

  } catch (error) {
    return res.status(500).json({ error: "Erro interno: " + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
