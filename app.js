const form = document.querySelector('#scene-form');
const updateButton = document.querySelector('#update-scene');
const sceneList = document.querySelector('#scene-list');
const template = document.querySelector('#scene-item-template');
const playAllButton = document.querySelector('#play-all');
const exportJsonButton = document.querySelector('#export-json');
const exportVideoButton = document.querySelector('#export-video');
const exportStatus = document.querySelector('#export-status');
const exportButton = document.querySelector('#export-json');
const timelineSummary = document.querySelector('#timeline-summary');
const previewName = document.querySelector('#preview-name');

const stage = document.querySelector('#preview-stage');
const previewCard = document.querySelector('.preview-card');
const stageTitle = document.querySelector('#stage-title');
const stageSubtitle = document.querySelector('#stage-subtitle');
const stageDuration = document.querySelector('#stage-duration');
const renderCanvas = document.querySelector('#render-canvas');
const renderContext = renderCanvas.getContext('2d');

const fields = {
  title: document.querySelector('#title'),
  subtitle: document.querySelector('#subtitle'),
  duration: document.querySelector('#duration'),
  background: document.querySelector('#background'),
  animation: document.querySelector('#animation'),
};

const supportedAnimations = new Set(['fade-up', 'slide-left', 'zoom-in', 'pop']);
const VIDEO_FPS = 30;
const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;

function logToConsole(method, message, details) {
  if (typeof console === 'undefined' || typeof console[method] !== 'function') {
    return;
  }

  if (details === undefined) {
    console[method](`[Animated Video Studio] ${message}`);
    return;
  }

  console[method](`[Animated Video Studio] ${message}`, details);
}

function debugFailure(reason, details = {}) {
  logToConsole('warn', `Animation playback issue: ${reason}`, details);
}

function setStatus(message) {
  exportStatus.textContent = message;
}

function generateSceneId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  debugFailure('crypto.randomUUID() is unavailable; using a timestamp fallback for scene IDs.');
  return `scene-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const state = {
  scenes: [
    {
      id: generateSceneId(),
const state = {
  scenes: [
    {
      id: crypto.randomUUID(),
      title: 'Welcome to your video',
      subtitle: 'Use the controls on the left to build scene-based animated content.',
      duration: 4,
      background: '#6c63ff',
      animation: 'fade-up',
    },
  ],
  selectedSceneId: null,
  playbackTimer: null,
  playbackToken: 0,
  lastAnimationStartAt: 0,
  isExportingVideo: false,
};

state.selectedSceneId = state.scenes[0].id;

function getSelectedScene() {
  return state.scenes.find((scene) => scene.id === state.selectedSceneId) ?? state.scenes[0] ?? null;
}

function getSafeDuration(duration) {
  const parsedDuration = Number(duration);
  if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
    debugFailure('Scene duration is invalid; falling back to 1 second.', { duration });
    return 1;
  }

  return parsedDuration;
}

function getSafeAnimationPreset(animation) {
  if (!supportedAnimations.has(animation)) {
    debugFailure('Unknown animation preset requested; falling back to fade-up.', { animation });
    return 'fade-up';
  }

  return animation;
}

function getAnimationDuration(duration) {
  const safeDuration = getSafeDuration(duration);
  return Math.min(Math.max(safeDuration * 0.35, 0.6), 1.2);
}

function normalizeScene(scene) {
  return {
    ...scene,
    title: scene.title || 'Untitled scene',
    subtitle: scene.subtitle || '',
    duration: getSafeDuration(scene.duration),
    background: scene.background || '#6c63ff',
    animation: getSafeAnimationPreset(scene.animation),
  };
}

function getFormData() {
  return {
    id: generateSceneId(),
    title: fields.title.value.trim(),
    subtitle: fields.subtitle.value.trim(),
    duration: getSafeDuration(fields.duration.value),
    background: fields.background.value,
    animation: getSafeAnimationPreset(fields.animation.value),
function getFormData() {
  return {
    id: crypto.randomUUID(),
    title: fields.title.value.trim(),
    subtitle: fields.subtitle.value.trim(),
    duration: Number(fields.duration.value),
    background: fields.background.value,
    animation: fields.animation.value,
  };
}

function setFormData(scene) {
  fields.title.value = scene.title;
  fields.subtitle.value = scene.subtitle;
  fields.duration.value = scene.duration;
  fields.background.value = scene.background;
  fields.animation.value = scene.animation;
}

function deferFrame(callback) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
    return;
  }

  setTimeout(callback, 32);
}

function verifyAnimationPlayback(scene, playbackToken) {
  deferFrame(() => {
    if (playbackToken !== state.playbackToken) {
      return;
    }

    if (!previewCard.classList.contains('is-animating')) {
      debugFailure('Preview card never entered the animating state.', { sceneId: scene.id, animation: scene.animation });
      return;
    }

    const computedStyles = window.getComputedStyle(previewCard);
    if (!computedStyles || computedStyles.animationName === 'none') {
      debugFailure('No CSS keyframes were applied to the preview card.', { sceneId: scene.id, animation: scene.animation });
      return;
    }

    if (!state.lastAnimationStartAt) {
      debugFailure('No animationstart event was detected after playback began.', { sceneId: scene.id, animation: scene.animation });
    }
  });
}

function getAnimationDuration(duration) {
  const safeDuration = getSafeDuration(duration);
  return Math.min(Math.max(safeDuration * 0.35, 0.6), 1.2);
}

function resetAnimationState(element) {
  if (!element) {
    return;
  }

  element.style.animation = 'none';
  void element.offsetWidth;
  element.style.animation = '';
}

function restartAnimation(scene) {
  if (!previewCard || !stage) {
    debugFailure('Preview DOM elements are missing; cannot restart animation.');
    return;
  }

  const normalizedScene = normalizeScene(scene);

  previewCard.classList.remove('is-animating');
  stage.dataset.animation = normalizedScene.animation;
  stage.style.setProperty('--scene-duration', `${normalizedScene.duration}s`);
  stage.style.setProperty('--animation-duration', `${getAnimationDuration(normalizedScene.duration)}s`);
  const safeDuration = getSafeDuration(scene.duration);
  const safeAnimation = getSafeAnimationPreset(scene.animation);

  previewCard.classList.remove('is-animating');
  stage.dataset.animation = safeAnimation;
  stage.style.setProperty('--scene-duration', `${safeDuration}s`);
  stage.style.setProperty('--animation-duration', `${getAnimationDuration(safeDuration)}s`);
  state.lastAnimationStartAt = 0;

  resetAnimationState(previewCard);
  resetAnimationState(stageTitle);
  resetAnimationState(stageSubtitle);
  resetAnimationState(stageDuration);

  void previewCard.offsetWidth;

  previewCard.classList.add('is-animating');
  verifyAnimationPlayback(normalizedScene, state.playbackToken);
}

function renderPreview(scene, { replay = false } = {}) {
  const normalizedScene = normalizeScene(scene);

  previewName.textContent = normalizedScene.title;
  stageTitle.textContent = normalizedScene.title;
  stageSubtitle.textContent = normalizedScene.subtitle || 'No subtitle for this scene yet.';
  stageDuration.textContent = `${normalizedScene.duration}s`;
  stage.style.background = `linear-gradient(135deg, ${normalizedScene.background}, #11152d)`;
  stage.dataset.animation = normalizedScene.animation;
  stage.style.setProperty('--scene-duration', `${normalizedScene.duration}s`);
  stage.style.setProperty('--animation-duration', `${getAnimationDuration(normalizedScene.duration)}s`);
  Object.assign(scene, normalizedScene);

  if (replay) {
    restartAnimation(normalizedScene);
  }
  verifyAnimationPlayback({ ...scene, duration: safeDuration, animation: safeAnimation }, state.playbackToken);
}

function renderPreview(scene, { replay = false } = {}) {
  const safeDuration = getSafeDuration(scene.duration);
  const safeAnimation = getSafeAnimationPreset(scene.animation);

  previewName.textContent = scene.title;
  stageTitle.textContent = scene.title;
  stageSubtitle.textContent = scene.subtitle || 'No subtitle for this scene yet.';
  stageDuration.textContent = `${safeDuration}s`;
  stage.style.background = `linear-gradient(135deg, ${scene.background}, #11152d)`;
  stage.dataset.animation = safeAnimation;
  stage.style.setProperty('--scene-duration', `${safeDuration}s`);
  stage.style.setProperty('--animation-duration', `${getAnimationDuration(safeDuration)}s`);
  scene.duration = safeDuration;
  scene.animation = safeAnimation;

  if (replay) {
    restartAnimation(scene);
  }
function renderPreview(scene) {
  previewName.textContent = scene.title;
  stageTitle.textContent = scene.title;
  stageSubtitle.textContent = scene.subtitle || 'No subtitle for this scene yet.';
  stageDuration.textContent = `${scene.duration}s`;
  stage.style.background = `linear-gradient(135deg, ${scene.background}, #11152d)`;
  stage.className = `preview-stage ${scene.animation}`;
}

function renderTimeline() {
  sceneList.innerHTML = '';

  const totalSeconds = state.scenes.reduce((sum, scene) => sum + getSafeDuration(scene.duration), 0);
  const totalSeconds = state.scenes.reduce((sum, scene) => sum + scene.duration, 0);
  timelineSummary.textContent = `${state.scenes.length} scene${state.scenes.length === 1 ? '' : 's'} · ${totalSeconds} seconds`;

  state.scenes.forEach((scene, index) => {
    const fragment = template.content.cloneNode(true);
    const button = fragment.querySelector('.scene-select');
    const normalizedScene = normalizeScene(scene);
    fragment.querySelector('.scene-order').textContent = index + 1;
    fragment.querySelector('.scene-title').textContent = normalizedScene.title;
    fragment.querySelector('.scene-meta').textContent = `${normalizedScene.animation} · ${normalizedScene.duration}s`;
    fragment.querySelector('.scene-order').textContent = index + 1;
    fragment.querySelector('.scene-title').textContent = scene.title;
    fragment.querySelector('.scene-meta').textContent = `${scene.animation} · ${scene.duration}s`;

    if (scene.id === state.selectedSceneId) {
      button.classList.add('active');
    }

    button.addEventListener('click', () => {
      state.selectedSceneId = scene.id;
      setFormData(normalizedScene);
      render({ replay: false });
      setFormData(scene);
      render({ replay: false });
      render();
    });

    sceneList.appendChild(fragment);
  });
}

function render(options = {}) {
  const selectedScene = getSelectedScene();
  if (!selectedScene) {
    debugFailure('No selected scene is available to render.');
    return;
  }

  renderPreview(selectedScene, options);
  renderTimeline();
}

function syncSelectedSceneFromForm({ replay = false } = {}) {
  const selectedScene = getSelectedScene();
  if (!selectedScene) {
    debugFailure('No selected scene is available to update from the form.');
    return;
  }

  selectedScene.title = fields.title.value.trim() || 'Untitled scene';
  selectedScene.subtitle = fields.subtitle.value.trim();
  selectedScene.duration = getSafeDuration(fields.duration.value);
  selectedScene.background = fields.background.value;
  selectedScene.animation = getSafeAnimationPreset(fields.animation.value);

  render({ replay });
}

function waitForPlayback(durationSeconds, playbackToken) {
  return new Promise((resolve) => {
    state.playbackTimer = setTimeout(() => resolve(playbackToken === state.playbackToken), durationSeconds * 1000);
  });
}

function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const normalized = cleanHex.length === 3 ? cleanHex.split('').map((part) => part + part).join('') : cleanHex;
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function easeOutCubic(progress) {
  return 1 - ((1 - progress) ** 3);
}

function easeOutBack(progress) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + (c3 * ((progress - 1) ** 3)) + (c1 * ((progress - 1) ** 2));
}

function getCanvasAnimationState(scene, elapsedSeconds) {
  const animationDuration = getAnimationDuration(scene.duration);
  const progress = Math.min(elapsedSeconds / animationDuration, 1);
  const eased = easeOutCubic(progress);

  if (scene.animation === 'slide-left') {
    return {
      opacity: progress,
      translateX: (1 - eased) * 180,
      translateY: 0,
      scale: 1,
      rotate: 0,
    };
  }

  if (scene.animation === 'zoom-in') {
    return {
      opacity: progress,
      translateX: 0,
      translateY: 0,
      scale: 0.72 + (0.28 * eased),
      rotate: 0,
    };
  }

  if (scene.animation === 'pop') {
    return {
      opacity: progress,
      translateX: 0,
      translateY: 0,
      scale: 0.55 + (0.45 * easeOutBack(progress)),
      rotate: (1 - eased) * -0.05,
    };
  }

  return {
    opacity: progress,
    translateX: 0,
    translateY: (1 - eased) * 70,
    scale: 0.96 + (0.04 * eased),
    rotate: 0,
  };
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawWrappedText(context, text, x, startY, maxWidth, lineHeight) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }

    currentLine = testLine;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.forEach((line, index) => {
    context.fillText(line, x, startY + (index * lineHeight));
  });

  return lines.length;
}

function drawSceneToCanvas(scene, elapsedSeconds) {
  const normalizedScene = normalizeScene(scene);
  const context = renderContext;
  const width = VIDEO_WIDTH;
  const height = VIDEO_HEIGHT;
  const cardWidth = 760;
  const cardHeight = 340;
  const animationState = getCanvasAnimationState(normalizedScene, elapsedSeconds);

  context.clearRect(0, 0, width, height);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, normalizedScene.background);
  gradient.addColorStop(1, '#11152d');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(width / 2 + animationState.translateX, height / 2 + animationState.translateY);
  context.rotate(animationState.rotate);
  context.scale(animationState.scale, animationState.scale);
  context.globalAlpha = Math.max(0, Math.min(animationState.opacity, 1));

  drawRoundedRect(context, -cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 30);
  context.fillStyle = 'rgba(0, 0, 0, 0.24)';
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  context.stroke();

  context.fillStyle = '#f5f7ff';
  context.font = '700 56px Inter, Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText(normalizedScene.title, 0, -45);

  context.fillStyle = 'rgba(245, 247, 255, 0.78)';
  context.font = '400 28px Inter, Arial, sans-serif';
  const subtitleLines = drawWrappedText(context, normalizedScene.subtitle || 'No subtitle for this scene yet.', 0, 15, 560, 38);

  const badgeText = `${normalizedScene.duration}s • ${normalizedScene.animation}`;
  context.font = '600 22px Inter, Arial, sans-serif';
  const badgeWidth = Math.max(190, context.measureText(badgeText).width + 44);
  const badgeHeight = 48;
  const badgeY = 88 + (Math.max(subtitleLines, 1) * 18);

  drawRoundedRect(context, -badgeWidth / 2, badgeY, badgeWidth, badgeHeight, 24);
  context.fillStyle = rgba(normalizedScene.background, 0.26);
  context.fill();
  context.fillStyle = '#f5f7ff';
  context.fillText(badgeText, 0, badgeY + 31);
  context.restore();
}

function getMimeType() {
  if (typeof MediaRecorder === 'undefined') {
    return '';
  }

  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  return mimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? '';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderTimelineToVideo() {
  return new Promise((resolve, reject) => {
    if (!renderContext) {
      reject(new Error('Canvas rendering is unavailable in this browser.'));
      return;
    }

    if (typeof renderCanvas.captureStream !== 'function') {
      reject(new Error('Canvas stream capture is unavailable in this browser.'));
      return;
    }

    const mimeType = getMimeType();
    if (!mimeType) {
      reject(new Error('This browser does not support WebM recording with MediaRecorder.'));
      return;
    }

    const normalizedScenes = state.scenes.map(normalizeScene);
    const totalDuration = normalizedScenes.reduce((sum, scene) => sum + scene.duration, 0);
    if (!normalizedScenes.length || totalDuration <= 0) {
      reject(new Error('There are no scenes available to export.'));
      return;
    }

    renderCanvas.width = VIDEO_WIDTH;
    renderCanvas.height = VIDEO_HEIGHT;
    const stream = renderCanvas.captureStream(VIDEO_FPS);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks = [];
    let startTime = 0;
    let rafId = 0;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onerror = (event) => {
      reject(event.error ?? new Error('MediaRecorder failed during export.'));
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      if (!chunks.length) {
        reject(new Error('Video export finished without any recorded frames.'));
        return;
      }

      resolve(new Blob(chunks, { type: mimeType }));
    };

    function renderFrame(now) {
      if (!startTime) {
        startTime = now;
      }

      const elapsedSeconds = Math.min((now - startTime) / 1000, totalDuration);
      let elapsedCursor = 0;
      let activeScene = normalizedScenes[0];
      let sceneElapsed = elapsedSeconds;

      normalizedScenes.some((scene) => {
        if (elapsedSeconds < elapsedCursor + scene.duration) {
          activeScene = scene;
          sceneElapsed = elapsedSeconds - elapsedCursor;
          return true;
        }

        elapsedCursor += scene.duration;
        return false;
      });

      drawSceneToCanvas(activeScene, sceneElapsed);
      setStatus(`Rendering video… ${Math.min((elapsedSeconds / totalDuration) * 100, 100).toFixed(0)}%`);

      if (elapsedSeconds >= totalDuration) {
        setTimeout(() => recorder.stop(), 100);
        return;
      }

      rafId = requestAnimationFrame(renderFrame);
    }

    recorder.start();
    drawSceneToCanvas(normalizedScenes[0], 0);
    rafId = requestAnimationFrame(renderFrame);

    recorder.addEventListener('stop', () => cancelAnimationFrame(rafId), { once: true });
  });
}

previewCard.addEventListener('animationstart', () => {
  state.lastAnimationStartAt = Date.now();
});

previewCard.addEventListener('animationcancel', (event) => {
  logToConsole('info', 'Animation was cancelled before completion.', {
    animationName: event.animationName,
    elapsedTime: event.elapsedTime,
  });
});

function render() {
  const selectedScene = state.scenes.find((scene) => scene.id === state.selectedSceneId) ?? state.scenes[0];
  if (!selectedScene) {
    return;
  }

  renderPreview(selectedScene);
  renderTimeline();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const scene = getFormData();

  if (!scene.title) {
    fields.title.focus();
    debugFailure('Cannot add a scene without a title.');
    return;
  }

  state.scenes.push(scene);
  state.selectedSceneId = scene.id;
  form.reset();
  fields.duration.value = 4;
  fields.background.value = '#6c63ff';
  fields.animation.value = 'fade-up';
  render({ replay: true });
});

updateButton.addEventListener('click', () => {
  const selectedScene = getSelectedScene();
  if (!selectedScene) {
    debugFailure('No selected scene is available to update.');
    return;
  }

  if (!fields.title.value.trim()) {
    fields.title.focus();
    debugFailure('Cannot update a scene without a title.', { sceneId: selectedScene.id });
    return;
  }

  syncSelectedSceneFromForm({ replay: true });
});

Object.entries(fields).forEach(([key, field]) => {
  const eventName = key === 'animation' ? 'change' : 'input';
  field.addEventListener(eventName, () => {
    const shouldReplay = key === 'animation';
    syncSelectedSceneFromForm({ replay: shouldReplay });
  });
});

playAllButton.addEventListener('click', async () => {
  const selectedScene = getSelectedScene();
  if (!selectedScene) {
    debugFailure('Playback was requested without a selected scene.');
    return;
  }

  clearTimeout(state.playbackTimer);
  state.playbackToken += 1;
  const playbackToken = state.playbackToken;

  const startIndex = state.scenes.findIndex((scene) => scene.id === selectedScene.id);
  if (startIndex === -1) {
    debugFailure('Selected scene was not found in the timeline.', { selectedSceneId: selectedScene.id });
    return;
  }

  const scenesToPlay = state.scenes.slice(startIndex).map(normalizeScene);
  setStatus(`Playing ${scenesToPlay.length} scene${scenesToPlay.length === 1 ? '' : 's'} from the selected scene.`);
  const scenesToPlay = state.scenes.slice(startIndex);
  if (!scenesToPlay.length) {
    debugFailure('Playback was requested, but there are no timeline scenes to play.');
    return;
  }

  for (const scene of scenesToPlay) {
    state.selectedSceneId = scene.id;
    setFormData(scene);
    render({ replay: true });

    // eslint-disable-next-line no-await-in-loop
    const stillCurrentPlayback = await waitForPlayback(scene.duration, playbackToken);
    const stillCurrentPlayback = await waitForPlayback(getSafeDuration(scene.duration), playbackToken);
    if (!stillCurrentPlayback) {
      logToConsole('info', 'Playback was interrupted by a newer play request.', { playbackToken });
      return;
    }
  }

  setStatus('Timeline playback finished. Ready to export a WebM video.');
});

exportJsonButton.addEventListener('click', () => {
  const project = {
    exportedAt: new Date().toISOString(),
    totalDuration: state.scenes.reduce((sum, scene) => sum + getSafeDuration(scene.duration), 0),
    scenes: state.scenes.map(normalizeScene),
  };

  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'animated-video-project.json');
  setStatus('Project JSON exported.');
});

exportVideoButton.addEventListener('click', async () => {
  if (state.isExportingVideo) {
    return;
  }

  state.isExportingVideo = true;
  exportVideoButton.disabled = true;
  setStatus('Starting WebM export…');

  try {
    const videoBlob = await renderTimelineToVideo();
    downloadBlob(videoBlob, 'animated-video.webm');
    setStatus('WebM video exported successfully.');
  } catch (error) {
    debugFailure('Video export failed.', { message: error.message });
    setStatus(`Video export failed: ${error.message}`);
  } finally {
    state.isExportingVideo = false;
    exportVideoButton.disabled = false;
  }
  render();
});

updateButton.addEventListener('click', () => {
  const index = state.scenes.findIndex((scene) => scene.id === state.selectedSceneId);
  if (index === -1) {
    return;
  }

  const current = state.scenes[index];
  const updatedScene = {
    ...current,
    title: fields.title.value.trim(),
    subtitle: fields.subtitle.value.trim(),
    duration: Number(fields.duration.value),
    background: fields.background.value,
    animation: fields.animation.value,
  };

  if (!updatedScene.title) {
    fields.title.focus();
    return;
  }

  state.scenes[index] = updatedScene;
  render();
});

playAllButton.addEventListener('click', async () => {
  clearTimeout(state.playbackTimer);

  for (const scene of state.scenes) {
    state.selectedSceneId = scene.id;
    render();
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => {
      state.playbackTimer = setTimeout(resolve, scene.duration * 1000);
    });
  }
});

exportButton.addEventListener('click', () => {
  const project = {
    exportedAt: new Date().toISOString(),
    totalDuration: state.scenes.reduce((sum, scene) => sum + getSafeDuration(scene.duration), 0),
    totalDuration: state.scenes.reduce((sum, scene) => sum + scene.duration, 0),
    scenes: state.scenes,
  };

  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'animated-video-project.json';
  anchor.click();
  URL.revokeObjectURL(url);
});

setFormData(state.scenes[0]);
render({ replay: true });
render();
