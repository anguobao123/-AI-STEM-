<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  categoryName: { type: String, default: "" },
  split: { type: String, default: "train" }
});

const emit = defineEmits(["update:modelValue", "captured"]);

const videoRef = ref(null);
const canvasRef = ref(null);
const streamRef = ref(null);
const cameraActive = ref(false);
const capturedBlob = ref(null);
const capturedUrl = ref("");
const cameraError = ref("");
const requestingCamera = ref(false);
const capturing = ref(false);
const selectedSplit = ref("train");

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value)
});

function clearCapturedImage() {
  if (capturedUrl.value) URL.revokeObjectURL(capturedUrl.value);
  capturedUrl.value = "";
  capturedBlob.value = null;
}

function stopCamera() {
  const stream = streamRef.value;
  stream?.getTracks?.().forEach((track) => track.stop());
  streamRef.value = null;
  cameraActive.value = false;
  if (videoRef.value) videoRef.value.srcObject = null;
}

function cameraFailureMessage(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return "无法访问摄像头，请检查浏览器摄像头权限。摄像头通常需要 HTTPS 或 localhost 环境。";
  }
  if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") {
    return "没有找到可用摄像头，请连接摄像头或改用本地上传图片。";
  }
  if (error?.name === "NotReadableError" || error?.name === "AbortError") {
    return "摄像头可能正被其他程序占用，请关闭其他程序后重试。";
  }
  return `摄像头开启失败：${error?.message || "请检查浏览器权限或改用本地上传图片。"}`;
}

async function startCamera() {
  cameraError.value = "";
  clearCapturedImage();
  stopCamera();
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = "当前浏览器不支持摄像头采集，请使用本地上传图片。";
    return;
  }

  requestingCamera.value = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    streamRef.value = stream;
    await nextTick();
    if (!videoRef.value) throw new Error("摄像头画面初始化失败。");
    videoRef.value.srcObject = stream;
    await videoRef.value.play();
    cameraActive.value = true;
  } catch (error) {
    stopCamera();
    cameraError.value = cameraFailureMessage(error);
  } finally {
    requestingCamera.value = false;
  }
}

async function captureFrame() {
  cameraError.value = "";
  const video = videoRef.value;
  const canvas = canvasRef.value;
  if (!cameraActive.value || !video || !canvas) {
    cameraError.value = "请先开启摄像头。";
    return;
  }

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    cameraError.value = "摄像头画面尚未准备好，请稍后再拍摄。";
    return;
  }

  capturing.value = true;
  try {
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法创建截图画布。");
    context.drawImage(video, 0, 0, width, height);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("截图结果为空。")), "image/jpeg", 0.9);
    });
    capturedBlob.value = blob;
    capturedUrl.value = URL.createObjectURL(blob);
    stopCamera();
  } catch (error) {
    cameraError.value = `拍摄失败：${error?.message || "请重试或改用本地上传图片。"}`;
  } finally {
    capturing.value = false;
  }
}

function confirmCapture() {
  cameraError.value = "";
  const categoryName = props.categoryName.trim();
  if (!categoryName) {
    cameraError.value = "当前没有选择有效类别，请关闭后重新选择。";
    return;
  }
  if (!['train', 'test'].includes(selectedSplit.value)) {
    cameraError.value = "当前没有选择训练或测试用途，请关闭后重新选择。";
    return;
  }
  if (!capturedBlob.value) {
    cameraError.value = "请先拍摄图片。";
    return;
  }

  const safeCategory = categoryName.replace(/[\\/:*?"<>|\s]+/g, "-");
  const file = new File(
    [capturedBlob.value],
    `camera-${safeCategory}-${selectedSplit.value}-${Date.now()}.jpg`,
    { type: "image/jpeg", lastModified: Date.now() }
  );
  emit("captured", file, selectedSplit.value);
}

function closeDialog() {
  stopCamera();
  clearCapturedImage();
  cameraError.value = "";
  emit("update:modelValue", false);
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      cameraError.value = "";
      clearCapturedImage();
      selectedSplit.value = ['train', 'test'].includes(props.split) ? props.split : "train";
    } else {
      stopCamera();
      clearCapturedImage();
    }
  }
);

onBeforeUnmount(() => {
  stopCamera();
  clearCapturedImage();
});
</script>

<template>
  <el-dialog v-model="dialogVisible" title="摄像头采集图片" width="min(680px, 94vw)" :close-on-click-modal="false" @closed="closeDialog">
    <div class="camera-dialog-body">
      <el-alert
        title="请拍摄水果、文具、书本、水杯等普通物品。请勿拍摄人脸、姓名牌、证件、屏幕隐私信息等敏感内容。"
        type="warning"
        :closable="false"
        show-icon
      />
      <div class="capture-context">
        <span>当前类别：<strong>{{ categoryName || "未选择" }}</strong></span>
        <label class="split-selector"><span>图片用途：</span><el-radio-group v-model="selectedSplit"><el-radio-button value="train">训练图片</el-radio-button><el-radio-button value="test">测试图片</el-radio-button></el-radio-group></label>
      </div>

      <div class="camera-stage">
        <video v-show="!capturedUrl" ref="videoRef" class="camera-media" autoplay muted playsinline data-testid="camera-video"></video>
        <img v-if="capturedUrl" :src="capturedUrl" class="camera-media" alt="摄像头拍摄预览" data-testid="camera-preview" />
        <div v-if="!cameraActive && !capturedUrl" class="camera-placeholder">
          <strong>摄像头尚未开启</strong>
          <span>点击“开启摄像头”后，浏览器会请求权限。</span>
        </div>
        <canvas ref="canvasRef" class="capture-canvas" aria-hidden="true"></canvas>
      </div>

      <el-alert v-if="cameraError" :title="cameraError" type="error" :closable="false" show-icon data-testid="camera-error" />
      <p class="local-only-note">视频流只用于当前实时预览，不会保存或上传；加入数据集时仅保留拍摄的单张图片。</p>
    </div>

    <template #footer>
      <div class="camera-actions">
        <el-button v-if="!cameraActive && !capturedUrl" :loading="requestingCamera" @click="startCamera">开启摄像头</el-button>
        <el-button v-if="cameraActive" type="primary" :loading="capturing" @click="captureFrame">拍摄</el-button>
        <el-button v-if="capturedUrl" @click="startCamera">重拍</el-button>
        <el-button v-if="capturedUrl" type="primary" data-testid="confirm-camera-capture" @click="confirmCapture">加入当前类别</el-button>
        <el-button @click="closeDialog">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.camera-dialog-body { display: grid; gap: 14px; }
.capture-context { display: flex; flex-wrap: wrap; gap: 10px 20px; color: var(--muted); font-size: 13px; }
.capture-context strong { color: var(--heading); }
.split-selector { display: inline-flex; align-items: center; gap: 8px; }
.camera-stage {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: #0f172a;
}
.camera-media { width: 100%; height: 100%; display: block; object-fit: cover; }
.camera-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 8px;
  padding: 24px;
  color: #e2e8f0;
  text-align: center;
}
.camera-placeholder span { color: #94a3b8; font-size: 13px; }
.capture-canvas { display: none; }
.local-only-note { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.6; }
.camera-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }

@media (max-width: 560px) {
  .camera-actions { justify-content: stretch; }
  .camera-actions :deep(.el-button) { flex: 1 1 calc(50% - 8px); margin-left: 0; }
}
</style>
