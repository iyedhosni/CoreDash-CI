const express = require("express");
const router = express.Router();
const k8sCtrl = require("../controllers/kubernetes.controller");

router.get("/pods", k8sCtrl.getPods);

module.exports = router;
