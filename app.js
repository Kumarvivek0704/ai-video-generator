const form = document.querySelector('#scene-form');
const updateButton = document.querySelector('#update-scene');
const sceneList = document.querySelector('#scene-list');
const template = document.querySelector('#scene-item-template');
const playAllButton = document.querySelector('#play-all');
const exportButton = document.querySelector('#export-json');
const timelineSummary = document.querySelector('#timeline-summary');
const previewName = document.querySelector('#preview-name');

const stage = document.querySelector('#preview-stage');
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
};

state.selectedSceneId = state.scenes[0].id;

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
      render();
    });

    sceneList.appendChild(fragment);
  });
}

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
    return;
  }

  state.scenes.push(scene);
  state.selectedSceneId = scene.id;
  form.reset();
  fields.duration.value = 4;
  fields.background.value = '#6c63ff';
  fields.animation.value = 'fade-up';
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
render();
