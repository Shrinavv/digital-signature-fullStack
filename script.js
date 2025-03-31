// Dark Mode Toggle
const toggle = document.querySelector('.theme-toggle');
toggle.addEventListener('click', () => {
  document.body.setAttribute('data-theme', 
    document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
  );
  localStorage.setItem('theme', document.body.getAttribute('data-theme'));
});

// theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.body.setAttribute('data-theme', savedTheme);

//pad
const canvas = document.getElementById('signature-pad');
const ctx = canvas.getContext('2d');
let drawing = false;
let lastX = 0;
let lastY = 0;
let signatureHistory = [];
let historyIndex = -1;
function resizeCanvas() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
function saveState() {
  historyIndex++;
  signatureHistory = signatureHistory.slice(0, historyIndex);
  signatureHistory.push(canvas.toDataURL());
}

// Drawing logic
canvas.addEventListener('pointerdown', (e) => {
  drawing = true;
  ctx.lineWidth = e.pressure * 10 || 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = document.body.getAttribute('data-theme') === 'dark' ? '#fff' : '#000';
  lastX = e.offsetX;
  lastY = e.offsetY;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  saveState();
});

canvas.addEventListener('pointermove', (e) => {
  if (!drawing) return;
  ctx.lineWidth = e.pressure * 10 || 3;
  ctx.quadraticCurveTo(
    lastX, 
    lastY, 
    (e.offsetX + lastX) / 2, 
    (e.offsetY + lastY) / 2
  );
  ctx.stroke();
  
  lastX = e.offsetX;
  lastY = e.offsetY;
});

['pointerup', 'pointerout'].forEach(event => {
  canvas.addEventListener(event, () => {
    drawing = false;
    updateSignaturePreview();
  });
});
document.getElementById('clear-signature').addEventListener('click', () => {
  saveState();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  document.getElementById('signature-preview').innerHTML = '';
});
function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  restoreState();
}

function redo() {
  if (historyIndex >= signatureHistory.length - 1) return;
  historyIndex++;
  restoreState();
}

function restoreState() {
  const img = new Image();
  img.src = signatureHistory[historyIndex];
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  updateSignaturePreview();
}

document.getElementById('undo-btn').addEventListener('click', undo);
document.getElementById('redo-btn').addEventListener('click', redo);

//update signature
function updateSignaturePreview() {
  const preview = document.getElementById('signature-preview');
  preview.innerHTML = '<p>Your Signature:</p>';
  const img = document.createElement('img');
  img.src = canvas.toDataURL();
  img.style.maxWidth = '150px';
  preview.appendChild(img);
}
const uploadBox = document.querySelector('.upload-box');
const fileInput = document.getElementById('document');
uploadBox.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadBox.classList.add('drag-over');
});

uploadBox.addEventListener('dragleave', () => {
  uploadBox.classList.remove('drag-over');
});

uploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadBox.classList.remove('drag-over');
  fileInput.files = e.dataTransfer.files;
  handleFileUpload();
});
//choose file
fileInput.addEventListener('change', handleFileUpload);

function handleFileUpload() {
  const file = fileInput.files[0];
  if (!file) return;
  
  document.getElementById('file-name').textContent = file.name;
  document.getElementById('upload-status').textContent = '✓ Ready to sign';
  document.getElementById('upload-status').style.color = 'var(--success)';
  const progressBar = document.querySelector('.progress-bar');
  const progress = document.querySelector('.progress');
  progressBar.classList.remove('hidden');
  let width = 0;
  const interval = setInterval(() => {
    width += 5;
    progress.style.width = `${width}%`;
    if (width >= 100) {
      clearInterval(interval);
      progressBar.classList.add('hidden');
    }
  }, 100);
  //pdf
  if (file.type === 'application/pdf') {
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById('pdf-preview').innerHTML = `
        <embed src="${reader.result}" width="100%" height="200px" type="application/pdf">
      `;
      document.getElementById('pdf-preview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
}
document.getElementById('signers-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('signer-email').value;
  //validation fot the email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('signer-email').classList.add('error');
    return;
  }
  
  document.getElementById('signer-email').classList.remove('error');
  const li = document.createElement('li');
  li.textContent = email;
  document.getElementById('signers-list').appendChild(li);
  e.target.reset();
});
document.getElementById('submit-document').addEventListener('click', () => {
  if (!fileInput.files.length) {
    alert('Please upload a document first');
    return;
  }
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#6C5CE7', '#00B894', '#FD79A8']
  });
  //mock
  const response = {
    status: 'success',
    message: 'Document sent for signing!',
    document: fileInput.files[0].name,
    signers: Array.from(document.querySelectorAll('#signers-list li')).map(li => li.textContent),
    timestamp: new Date().toISOString()
  };
  
  document.getElementById('response-data').textContent = JSON.stringify(response, null, 2);
  document.getElementById('api-response').classList.remove('hidden');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') undo();
  if (e.ctrlKey && e.key === 'y') redo();
  if (e.key === 'Escape') drawing = false;
});