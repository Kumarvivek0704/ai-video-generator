const form = document.querySelector('#scene-form');
const updateButton = document.querySelector('#update-scene');
const sceneList = document.querySelector('#scene-list');
const template = document.querySelector('#scene-item-template');
const playAllButton = document.querySelector('#play-all');
const exportButton = document.querySelector('#export-json');
const timelineSummary = document.querySelector('#timeline-summary');
const previewName = document.querySelector('#preview-name');

const stage = document.querySelector('#preview-stage');
const previewCard = document.querySelector('.preview-card');
const stageTitle = document.querySelector('#stage-title');
const stageSubtitle = document.querySelector('#stage-subtitle');
const stageDuration = document.querySelector('#stage-duration');

const fields = {
  title: document.querySelector('#title'),
  subtitle: document.querySelector('#subtitle'),
  duration: document.querySelector('#duration'),
  background: document.querySelector('#background'),
  animation: document.querySelector('#animation'),
};

const supportedAnimations = new Set(['fade-up', 'slide-left', 'zoom-in', 'pop']);

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

function getFormData() {
  return {
    id: generateSceneId(),
    title: fields.title.value.trim(),
    subtitle: fields.subtitle.value.trim(),
    duration: getSafeDuration(fields.duration.value),
    background: fields.background.value,
    animation: getSafeAnimationPreset(fields.animation.value),
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
}

function renderTimeline() {
  sceneList.innerHTML = '';

  const totalSeconds = state.scenes.reduce((sum, scene) => sum + getSafeDuration(scene.duration), 0);
  timelineSummary.textContent = `${state.scenes.length} scene${state.scenes.length === 1 ? '' : 's'} · ${totalSeconds} seconds`;

  state.scenes.forEach((scene, index) => {
    const fragment = template.content.cloneNode(true);
    const button = fragment.querySelector('.scene-select');
    fragment.querySelector('.scene-order').textContent = index + 1;
    fragment.querySelector('.scene-title').textContent = scene.title;
    fragment.querySelector('.scene-meta').textContent = `${scene.animation} · ${scene.duration}s`;

    if (scene.id === state.selectedSceneId) {
      button.classList.add('active');
    }

    button.addEventListener('click', () => {
      state.selectedSceneId = scene.id;
      setFormData(scene);
      render({ replay: false });
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

previewCard.addEventListener('animationstart', () => {
  state.lastAnimationStartAt = Date.now();
});

previewCard.addEventListener('animationcancel', (event) => {
  logToConsole('info', 'Animation was cancelled before completion.', {
    animationName: event.animationName,
    elapsedTime: event.elapsedTime,
  });
});

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
    const stillCurrentPlayback = await waitForPlayback(getSafeDuration(scene.duration), playbackToken);
    if (!stillCurrentPlayback) {
      logToConsole('info', 'Playback was interrupted by a newer play request.', { playbackToken });
      return;
    }
  }
});

exportButton.addEventListener('click', () => {
  const project = {
    exportedAt: new Date().toISOString(),
    totalDuration: state.scenes.reduce((sum, scene) => sum + getSafeDuration(scene.duration), 0),
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
