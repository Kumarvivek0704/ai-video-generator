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
};

state.selectedSceneId = state.scenes[0].id;

function getSelectedScene() {
  return state.scenes.find((scene) => scene.id === state.selectedSceneId) ?? state.scenes[0] ?? null;
}

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

function restartAnimation(scene) {
  previewCard.classList.remove('is-animating');
  stage.dataset.animation = scene.animation;
  stage.style.setProperty('--scene-duration', `${scene.duration}s`);

  void previewCard.offsetWidth;

  previewCard.classList.add('is-animating');
}

function renderPreview(scene, { replay = false } = {}) {
  previewName.textContent = scene.title;
  stageTitle.textContent = scene.title;
  stageSubtitle.textContent = scene.subtitle || 'No subtitle for this scene yet.';
  stageDuration.textContent = `${scene.duration}s`;
  stage.style.background = `linear-gradient(135deg, ${scene.background}, #11152d)`;
  stage.dataset.animation = scene.animation;
  stage.style.setProperty('--scene-duration', `${scene.duration}s`);

  if (replay) {
    restartAnimation(scene);
  }
}

function renderTimeline() {
  sceneList.innerHTML = '';

  const totalSeconds = state.scenes.reduce((sum, scene) => sum + scene.duration, 0);
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
    return;
  }

  renderPreview(selectedScene, options);
  renderTimeline();
}

function syncSelectedSceneFromForm({ replay = false } = {}) {
  const selectedScene = getSelectedScene();
  if (!selectedScene) {
    return;
  }

  selectedScene.title = fields.title.value.trim() || 'Untitled scene';
  selectedScene.subtitle = fields.subtitle.value.trim();
  selectedScene.duration = Number(fields.duration.value) || 1;
  selectedScene.background = fields.background.value;
  selectedScene.animation = fields.animation.value;

  render({ replay });
}

function waitForPlayback(durationSeconds, playbackToken) {
  return new Promise((resolve) => {
    state.playbackTimer = setTimeout(() => resolve(playbackToken === state.playbackToken), durationSeconds * 1000);
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const scene = getFormData();

  if (!scene.title) {
    fields.title.focus();
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
    return;
  }

  if (!fields.title.value.trim()) {
    fields.title.focus();
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
    return;
  }

  clearTimeout(state.playbackTimer);
  state.playbackToken += 1;
  const playbackToken = state.playbackToken;

  const startIndex = state.scenes.findIndex((scene) => scene.id === selectedScene.id);
  const scenesToPlay = state.scenes.slice(startIndex);

  for (const scene of scenesToPlay) {
    state.selectedSceneId = scene.id;
    setFormData(scene);
    render({ replay: true });

    // eslint-disable-next-line no-await-in-loop
    const stillCurrentPlayback = await waitForPlayback(scene.duration, playbackToken);
    if (!stillCurrentPlayback) {
      return;
    }
  }
});

exportButton.addEventListener('click', () => {
  const project = {
    exportedAt: new Date().toISOString(),
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
