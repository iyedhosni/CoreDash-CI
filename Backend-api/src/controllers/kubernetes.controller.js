const k8sService = require("../services/kubernetes.service");

exports.getPods = async (req, res) => {
  try {
    const rawData = await k8sService.listPods();

    const pods = rawData.items.map(pod => ({
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      status: pod.status.phase,
      cpuUsage: {
        used: Math.random() * 0.5 + 0.1,      // FAKE DATA (à remplacer par metrics-server)
        limit: 1
      },
      memoryUsage: {
        used: Math.floor(Math.random() * 200) * 1024 * 1024,
        limit: 512 * 1024 * 1024
      },
      startTime: pod.status.startTime
    }));

    res.json({ pods });
  } catch (err) {
    console.error("Kubernetes API error:", err.message);
    res.status(500).json({ error: "Failed to fetch pods" });
  }
};