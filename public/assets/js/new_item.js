// NEW: Function to display messages (moved from new_item.html)
function displayMessage(type, message) {
  const successDiv = document.getElementById('success-message');
  const errorDiv = document.getElementById('error-message');
  const successTextEl = document.getElementById('success-text-content');
  const errorTextEl = document.getElementById('error-text-content');

  // Hide both initially
  successDiv.classList.add('hidden');
  errorDiv.classList.add('hidden');

  if (type === 'success') {
    successTextEl.innerHTML = message; // Use innerHTML to allow links
    successDiv.classList.remove('hidden');
  } else if (type === 'error') {
    errorTextEl.textContent = message;
    errorDiv.classList.remove('hidden');
  }

  const messageContainer = document.getElementById('message-container');
  if (messageContainer) {
    messageContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  setTimeout(() => {
    successDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
  }, 7000); // Hide after 7 seconds
}

// Theme synchronization with parent
function syncTheme() {
  try {
    // Get theme from parent if we're in an iframe
    if (window.parent !== window) {
      const parentTheme = window.parent.document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', parentTheme === 'dark');
      
      // Watch for changes in parent theme
      const observer = new MutationObserver(() => {
        const newTheme = window.parent.document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
      });
      
      observer.observe(window.parent.document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  } catch (e) {
    console.log('Could not access parent theme due to CORS');
  }
}

// Initialize line numbers for the script editor
function initLineNumbers() {
  const textarea = document.getElementById('script');
  const lineNumbers = document.getElementById('line-numbers');
  
  function updateLineNumbers() {
    const lines = textarea.value.split('\n').length || 1;
    lineNumbers.innerHTML = Array(lines).fill('<span></span>').map((_, i) => `<span>${i + 1}</span>`).join('\n');
  }
  
  textarea.addEventListener('input', updateLineNumbers);
  updateLineNumbers();
}

// Format the Groovy script
function formatScript() {
  const textarea = document.getElementById('script');
  let script = textarea.value.trim();
  
  // Simple formatting (in a real app you'd use a proper Groovy formatter)
  try {
    // Indent curly braces
    script = script.replace(/\{\s*/g, '{\n  ').replace(/\s*\}/g, '\n}');
    
    // Indent stages
    script = script.replace(/stage\(/g, '  stage(');
    
    // Add newlines between major sections
    script = script.replace(/(pipeline|agent|stages|stage|steps)\b/g, '\n$1');
    
    textarea.value = script;
    updateLineNumbers();
    displayMessage('success', 'Script formatted');
  } catch (e) {
    displayMessage('error', 'Could not format script');
  }
}

// Load a template script
function loadTemplate() {
  const template = `pipeline {
  agent any
  
  options {
    timeout(time: 1, unit: 'HOURS')
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }
  
  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }
    
    stage('Build') {
      steps {
        sh './gradlew build'
      }
    }
    
    stage('Test') {
      steps {
        sh './gradlew test'
      }
      
      post {
        always {
          junit 'build/test-results/**/*.xml'
        }
      }
    }
    
    stage('Deploy') {
      when {
        branch 'main'
      }
      steps {
        sh './gradlew deploy'
      }
    }
  }
  
  post {
    success {
      slackSend channel: '#builds',
                color: 'good',
                message: "Build \${currentBuild.fullDisplayName} succeeded"
    }
    failure {
      slackSend channel: '#builds',
                color: 'danger',
                message: "Build \${currentBuild.fullDisplayName} failed"
    }
  }
}`;
  
  document.getElementById('script').value = template;
  updateLineNumbers();
  displayMessage('success', 'Template loaded');
}

// Cancel button handler
function handleCancel() {
  if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
    try {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'jenkins-job-cancel'
        }, '*');
      } else {
        window.location.href = 'dashboard.html';
      }
    } catch (e) {
      console.log('Could not notify parent window');
      window.location.href = 'dashboard.html';
    }
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  syncTheme();
  initLineNumbers();
  
  // Event listeners
  document.getElementById('jenkins-form').addEventListener('submit', submitJob);
  document.getElementById('btn-cancel').addEventListener('click', handleCancel);
  document.getElementById('btn-format').addEventListener('click', formatScript);
  document.getElementById('btn-template').addEventListener('click', loadTemplate);
  
  // Listen for theme changes from parent
  window.addEventListener('message', (event) => {
    if (event.data.type === 'theme-changed') {
      document.documentElement.classList.toggle('dark', event.data.theme === 'dark');
    }
  });
});

import { cleanupXml } from './utils.js';
const API_BASE_URL = 'http://localhost:3000/api';

async function submitJob(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-save');
  btn.disabled = true;

  // Collect form data
  const f = document.getElementById('jenkins-form');
  const data = {
    name: f.name.value.trim(),
    description: f.description.value.trim(),
    githubHook: f.githubHook.checked,
    script: f.script.value.trim()
  };

  // Load and interpolate our pipeline template
  let xml = await (await fetch('job_template.xml')).text();
  xml = xml
    .replace(/\$\{NAME\}/g, data.name)
    .replace(/\$\{DESCRIPTION\}/g, data.description)
    // Insert raw script into CDATA block
    .replace(/\$\{SCRIPT\}/g, data.script)
    // Optional GitHub Push Trigger
    .replace(/\$\{GITHUB_HOOK_TRIGGER\}/g, 
      data.githubHook 
        ? `<com.cloudbees.jenkins.GitHubPushTrigger plugin="github@1.37.1"/>` 
        : ''
    );

  // Clean up whitespace but leave CDATA alone
  xml = cleanupXml(xml);

  try {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`${API_BASE_URL}/jenkins/job/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: data.name, xml })
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || payload.message || JSON.stringify(payload));
    displayMessage('success', 'Job created successfully!');
    f.reset();
  } catch (err) {
    console.error('XML sent:', xml);
    console.error(err);
    displayMessage('error', 'Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Pipeline';
  }
}

document.getElementById('jenkins-form').addEventListener('submit', submitJob);