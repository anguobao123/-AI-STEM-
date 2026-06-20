import * as tf from "@tensorflow/tfjs";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      reject(new Error("无效图片文件。"));
      return;
    }

    if (file.type && !IMAGE_TYPES.includes(file.type)) {
      reject(new Error(`不支持的图片格式：${file.name}`));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`图片读取失败：${file.name}`));
    };
    image.src = objectUrl;
  });
}

export function imageToTensor(image, imageSize = 64) {
  return tf.tidy(() => {
    const pixels = tf.browser.fromPixels(image).toFloat();
    const resized = tf.image.resizeBilinear(pixels, [imageSize, imageSize]);
    return resized.div(255);
  });
}

export async function filesToDataset(classFileMap, imageSize = 64) {
  if (!Array.isArray(classFileMap) || classFileMap.length < 2) {
    throw new Error("至少需要 2 个类别才能开始真实训练。");
  }

  const activeClasses = classFileMap.filter((item) => item.className?.trim() && Array.isArray(item.files) && item.files.length > 0);
  if (activeClasses.length < 2) {
    throw new Error("至少需要 2 个有效类别，并为每个类别上传图片。");
  }

  const classNames = activeClasses.map((item) => item.className.trim());
  const tensorList = [];
  const labelList = [];
  const classStats = [];

  try {
    for (let classIndex = 0; classIndex < activeClasses.length; classIndex += 1) {
      const item = activeClasses[classIndex];
      const files = item.files.slice(0, 20);

      if (files.length < 2) {
        throw new Error(`类别“${item.className}”至少需要 2 张图片。`);
      }

      classStats.push({
        name: item.className.trim(),
        imageCount: files.length,
        trainCount: files.length,
        valCount: 0
      });

      for (const file of files) {
        const image = await loadImageFromFile(file);
        const tensor = imageToTensor(image, imageSize);
        tensorList.push(tensor);
        labelList.push(classIndex);
      }
    }

    const xs = tf.stack(tensorList);
    const ys = tf.oneHot(tf.tensor1d(labelList, "int32"), classNames.length);

    return {
      xs,
      ys,
      classNames,
      sampleCount: labelList.length,
      classStats
    };
  } catch (error) {
    tensorList.forEach((tensor) => tensor.dispose());
    throw error;
  } finally {
    tensorList.forEach((tensor) => tensor.dispose());
  }
}
