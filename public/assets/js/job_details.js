const API = 'http://localhost:3000/api/jenkins';

console.log('🔧 job_details.js loaded');

    const params = new URLSearchParams(window.location.search);
    const jobName = params.get('job') || 'Pipline_rename';
    let lastBuildStatus = null;
    let configXml = '';
    let theme = 'light';

    // Theme detection and synchronization with parent
    function detectTheme() {
      // If we're in an iframe, sync with parent theme
      if (window.self !== window.top) {
        try {
          // Listen for theme changes from parent
          window.addEventListener('message', (event) => {
            if (event.data && event.data.theme) {
              setTheme(event.data.theme);
            }
          });
          
          // Request initial theme from parent
          window.parent.postMessage({ type: 'requestTheme' }, '*');
        } catch (e) {
          console.log('Could not communicate with parent:', e);
          // Fallback to local storage or system preference
          const savedTheme = localStorage.getItem('theme');
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));
        }
      } else {
        // Not in iframe, use local preference
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));
      }
    }
    
    function setTheme(newTheme) {
      theme = newTheme;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }

    // Toast notification system
    function showToast(message, type = 'info') {
      const toast = document.getElementById('toast');
      const toastIcon = document.getElementById('toast-icon');
      const toastMessage = document.getElementById('toast-message');
      
      toast.className = `toast ${type}`;
      toastMessage.textContent = message;
      
      // Clear previous classes
      toastIcon.innerHTML = '';
      const icon = document.createElement('i');
      icon.className = 'fas';
      
      switch(type) {
        case 'success':
          icon.classList.add('fa-check-circle');
          break;
        case 'error':
          icon.classList.add('fa-exclamation-circle');
          break;
        default:
          icon.classList.add('fa-info-circle');
      }
      
      toastIcon.appendChild(icon);
      toast.classList.add('show');
      
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }

    // Modal system
    function openModal(id) {
      document.getElementById(id).classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeModal(id) {
      document.getElementById(id).classList.remove('active');
      document.body.style.overflow = 'auto';
      
      // Pause background music if hook modal is being closed
      if (id === 'hook-modal') {
        const backgroundMusic = document.getElementById('background-music');
        if (backgroundMusic) {
          backgroundMusic.pause();
          backgroundMusic.currentTime = 0; // Reset to start
        }
      }
    }

    // Format time
    function formatTime(timestamp) {
      if (!timestamp) return 'N/A';
      
      const now = Date.now();
      const diff = Math.floor((now - timestamp) / 1000);
      
      if (diff < 60) return `${diff} seconds ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
      return `${Math.floor(diff / 86400)} days ago`;
    }
    
    // Format time to HH:MM format
    function formatTimeToHHMM(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      let hours = date.getHours();
      let minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      minutes = minutes < 10 ? '0' + minutes : minutes;
      return `${hours}:${minutes} ${ampm}`;
    }

    // Format duration
    function formatDuration(duration) {
      if (!duration) return 'N/A';
      
      const seconds = Math.floor(duration / 1000) % 60;
      const minutes = Math.floor(duration / (1000 * 60)) % 60;
      const hours = Math.floor(duration / (1000 * 60 * 60));
      
      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m ${seconds}s`;
      return `${seconds}s`;
    }

    // Advanced Jenkins Pipeline formatter
    function formatScript(script) {
      if (!script) return '';
      
      // Common Jenkins Pipeline keywords that should be on new lines
      const BLOCK_STARTERS = [
        'stage', 'node', 'pipeline', 'agent', 'stages', 'steps', 'environment',
        'parameters', 'options', 'triggers', 'tools', 'when', 'post', 'script',
        'parallel', 'matrix', 'stash', 'unstash', 'ws', 'withCredentials',
        'withSonarQubeEnv', 'withMaven', 'withDockerContainer', 'withDockerRegistry',
        'withEnv', 'withCredentials', 'withDocker', 'withDockerContainer', 'withMaven'
      ];
      
      // Keywords that should have a newline before them
      const NEWLINE_BEFORE = ['stage', 'node', 'pipeline', 'parallel', 'matrix', 'post', 'when'];
      
      // Keywords that should have a newline after their block
      const NEWLINE_AFTER = ['stage', 'node', 'pipeline', 'parallel', 'matrix'];
      
      // Keywords that should be followed by a space
      const SPACE_AFTER = ['if', 'else', 'for', 'while', 'try', 'catch', 'finally', 'def'];
      
      let indent = 0;
      let inString = false;
      let stringChar = '';
      let inComment = false;
      let inBlockComment = false;
      const lines = [];
      let currentLine = '';
      
      // Tokenize the script
      const tokens = [];
      let token = '';
      
      for (let i = 0; i < script.length; i++) {
        const char = script[i];
        
        // Handle strings
        if ((char === '"' || char === "'") && !inComment && !inBlockComment) {
          if (!inString) {
            inString = true;
            stringChar = char;
            tokens.push({ type: 'string_start', value: char });
          } else if (char === stringChar && script[i-1] !== '\\') {
            inString = false;
            tokens.push({ type: 'string_end', value: char });
          } else {
            tokens.push({ type: 'string_char', value: char });
          }
          continue;
        }
        
        // Handle comments
        if (!inString && !inBlockComment && char === '/' && script[i+1] === '/') {
          inComment = true;
          tokens.push({ type: 'comment_start' });
          i++;
          continue;
        }
        
        if (!inString && !inComment && char === '/' && script[i+1] === '*') {
          inBlockComment = true;
          tokens.push({ type: 'block_comment_start' });
          i++;
          continue;
        }
        
        if (inBlockComment && char === '*' && script[i+1] === '/') {
          inBlockComment = false;
          tokens.push({ type: 'block_comment_end' });
          i++;
          continue;
        }
        
        if (inComment && char === '\n') {
          inComment = false;
          tokens.push({ type: 'comment_end' });
        }
        
        if (inComment || inBlockComment) {
          tokens.push({ type: inBlockComment ? 'block_comment_char' : 'comment_char', value: char });
          continue;
        }
        
        // Handle other tokens
        if (/[\s{}();,\[\]]/.test(char)) {
          if (token) {
            tokens.push({ type: 'word', value: token });
            token = '';
          }
          if (!/\s/.test(char)) {
            tokens.push({ type: 'symbol', value: char });
          }
        } else {
          token += char;
        }
      }
      
      if (token) {
        tokens.push({ type: 'word', value: token });
      }
      
      // Process tokens into lines with proper formatting
      let output = [];
      let currentIndent = 0;
      let needsNewline = false;
      let lastToken = null;
      
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        
        // Handle newlines and indentation
        if (needsNewline) {
          output.push('\n' + '  '.repeat(currentIndent));
          needsNewline = false;
        }
        
        // Handle different token types
        switch (token.type) {
          case 'word':
            // Add space after certain keywords
            if (SPACE_AFTER.includes(token.value) && tokens[i+1]?.type !== 'symbol' || tokens[i+1]?.value !== '(') {
              output.push(token.value + ' ');
            } else {
              output.push(token.value);
            }
            
            // Handle block starters
            if (BLOCK_STARTERS.includes(token.value) && tokens[i+1]?.value === '(') {
              // Skip parameters until closing parenthesis
              let j = i + 2;
              let parenCount = 1;
              while (j < tokens.length && parenCount > 0) {
                if (tokens[j].value === '(') parenCount++;
                if (tokens[j].value === ')') parenCount--;
                j++;
              }
              
              // If next non-whitespace is '{', add newline and indent
              while (j < tokens.length && tokens[j].type !== 'symbol') j++;
              if (tokens[j]?.value === '{') {
                output.push(' ');
                needsNewline = true;
                currentIndent++;
              }
            }
            break;
            
          case 'symbol':
            output.push(token.value);
            
            // Handle indentation for blocks
            if (token.value === '{') {
              // Special handling for specific blocks
              if (inPipeline || inStages || inStage || inPost || inWhen) {
                needsNewline = true;
                if (inWhen) {
                  // Keep when blocks on the same line
                  needsNewline = false;
                  output.push(' ');
                }
              }
              
              // Don't increase indent for steps block
              if (!inSteps) {
                currentIndent++;
              }
              
            } else if (token.value === '}') {
              // Decrease indent before closing brace
              if (!inSteps) {
                currentIndent = Math.max(0, currentIndent - 1);
              }
              
              // Add newline before closing brace for specific blocks
              const blockConfig = SPECIAL_BLOCKS[lastToken?.value] || {};
              if (blockConfig.newlineBeforeClose) {
                output.push('\n' + '  '.repeat(currentIndent));
              }
              
              needsNewline = true;
              
              // Reset block tracking when closing
              if (inPipeline && lastToken?.value === 'pipeline') inPipeline = false;
              if (inStages && lastToken?.value === 'stages') inStages = false;
              if (inStage && lastToken?.value === 'stage') inStage = false;
              if (inSteps && lastToken?.value === 'steps') inSteps = false;
              if (inPost && lastToken?.value === 'post') inPost = false;
              if (inWhen && lastToken?.value === 'when') inWhen = false;
              
            } else if (token.value === ';') {
              needsNewline = true;
            }
            break;
            
          case 'string_start':
            output.push(token.value);
            break;
            
          case 'string_char':
            output.push(token.value);
            break;
            
          case 'string_end':
            output.push(token.value);
            break;
            
          case 'comment_start':
            output.push('//');
            break;
            
          case 'comment_char':
            output.push(token.value);
            break;
            
          case 'comment_end':
            needsNewline = true;
            break;
            
          case 'block_comment_start':
            output.push('/*');
            break;
            
          case 'block_comment_char':
            output.push(token.value);
            break;
            
          case 'block_comment_end':
            output.push('*/');
            needsNewline = true;
            break;
        }
        
        lastToken = token;
      }
      
      // Join the output and clean up any double newlines
      let result = output.join('')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      // Ensure there's a newline at the end
      if (!result.endsWith('\n')) {
        result += '\n';
      }
      
      return result;
    }

    // Initialize the application
    async function init() {
      detectTheme();
      
      document.getElementById('job-name').textContent = jobName;
      
      // Set up event listeners
      setupEventListeners();
      
      // Load initial data
      await loadInitialData();
      
      // Show loading animation while fetching builds
      document.getElementById('build-list').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-hourglass-half"></i></div>
          <div class="empty-text">Loading build history...</div>
        </div>
      `;
      
      // Load builds
      await loadBuilds();
    }

    function setupEventListeners() {
      // Navigation
      document.getElementById('nav-repo').addEventListener('click', openHook);
      document.getElementById('nav-build').addEventListener('click', triggerBuild);
      document.getElementById('build-now-btn').addEventListener('click', triggerBuild);
      document.getElementById('nav-stages').addEventListener('click', openStages);
      document.getElementById('nav-hook').addEventListener('click', openHook);
      document.getElementById('nav-configure').addEventListener('click', openConfig);
      document.getElementById('nav-delete').addEventListener('click', () => openModal('delete-modal'));
      document.getElementById('nav-rename').addEventListener('click', () => openModal('rename-modal'));
      document.getElementById('close-build').addEventListener('click', () => closeModal('build-modal'));
      
      // Modal buttons
      document.getElementById('cancel-repo').addEventListener('click', () => closeModal('repo-modal'));
      document.getElementById('close-stages').addEventListener('click', () => closeModal('stages-modal'));
      document.getElementById('cancel-hook').addEventListener('click', () => closeModal('hook-modal'));
      document.getElementById('cancel-config').addEventListener('click', () => closeModal('config-modal'));
      document.getElementById('save-config-form').addEventListener('click', saveConfigForm);
      document.getElementById('cancel-delete').addEventListener('click', () => closeModal('delete-modal'));
      document.getElementById('confirm-delete').addEventListener('click', deleteJob);
      document.getElementById('cancel-rename').addEventListener('click', () => closeModal('rename-modal'));
      document.getElementById('confirm-rename').addEventListener('click', renameJob);
      
      // Editor buttons
      document.getElementById('cfg-script').addEventListener('input', updateCfgLineNumbers);
      document.getElementById('cfg-btn-format').addEventListener('click', () => formatScriptField('cfg-script'));
      document.getElementById('cfg-btn-template').addEventListener('click', () => loadTemplateToField('cfg-script'));
      
      // Close modals when clicking outside or on close buttons
      document.querySelectorAll('.modal').forEach(modal => {
        // Click outside content
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            closeModal(modal.id);
          }
        });
        
        // Close buttons inside modals
        const closeButtons = modal.querySelectorAll('.modal-close, .btn-outline');
        closeButtons.forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeModal(modal.id);
          });
        });
      });
    }

    async function loadInitialData() {
      try {
        // Fetch config to detect hook, pipeline and repository
        const respCfg = await fetchWithAuth(`${API}/job/${encodeURIComponent(jobName)}/config`);
        configXml = await respCfg.text();
        
        if (configXml.match(/GitHubPushTrigger|GitHubHook/)) {
          document.getElementById('nav-hook').classList.remove('hidden');
        }
        
        // Load permalinks
        await loadPermalinks();
        
        // Check if this is a pipeline job to show stages
        if (configXml.match(/org\.jenkinsci\.plugins\.workflow\.job/)) {
          document.getElementById('nav-stages').classList.remove('hidden');
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
        showToast('Failed to load job data', 'error');
      }
    }

    function populateConfigForm() {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(configXml, 'application/xml');

      // Description
      const desc = xmlDoc.querySelector('description');
      document.getElementById('cfg-description').value = desc ? desc.textContent : '';

      // GitHub hook?
      const hasHook = !!configXml.match(/GitHubPushTrigger|GitHubHook/);
      document.getElementById('cfg-github-hook').checked = hasHook;

      // Pipeline script
      const scriptNode = xmlDoc.querySelector('definition > script');
      document.getElementById('cfg-script').value = scriptNode ? scriptNode.textContent.trim() : '';
      
      updateCfgLineNumbers();
    }

    function updateCfgLineNumbers() {
      const ta = document.getElementById('cfg-script');
      const ln = document.getElementById('cfg-line-numbers');
      const lines = ta.value.split('\n').length || 1;
      ln.innerHTML = Array(lines).fill(0).map((_, i) => `<span>${i+1}</span>`).join('\n');
    }

    function formatScriptField(fieldId) {
      const textarea = document.getElementById(fieldId);
      try {
        // Simple Groovy formatting - adjust as needed
        let script = textarea.value;
        script = script
          .replace(/\b(def|if|else|for|while|try|catch|finally)\b/g, '\n$1 ')
          .replace(/\{\s*/g, ' {\n')
          .replace(/\s*\}/g, '\n}')
          .replace(/\;\s*/g, ';\n');
        textarea.value = script;
        updateCfgLineNumbers();
      } catch (e) {
        console.error('Formatting error:', e);
      }
    }

    async function loadTemplateToField(fieldId) {
      const textarea = document.getElementById(fieldId);
      try {
        const response = await fetchWithAuth('pipeline_template.groovy');
        if (response.ok) {
          textarea.value = await response.text();
          updateCfgLineNumbers();
        }
      } catch (e) {
        console.error('Failed to load template:', e);
      }
    }

    async function openConfig() {
      openModal('config-modal');
      
      try {
        const resp = await fetchWithAuth(`${API}/job/${encodeURIComponent(jobName)}/config`);
        if (resp.ok) {
          configXml = await resp.text();
          populateConfigForm();
        } else {
          showToast('Failed to load configuration', 'error');
        }
      } catch (error) {
        console.error('Failed to load config:', error);
        showToast('Error loading configuration', 'error');
      }
    }

    async function saveConfigForm() {
      const btn = document.getElementById('save-config-form');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      try {
        console.log('1. Collecting form data...');
        // Collect form data
        const data = {
          description: document.getElementById('cfg-description').value.trim(),
          githubHook: document.getElementById('cfg-github-hook').checked,
          script: document.getElementById('cfg-script').value.trim()
        };
        console.log('2. Form data collected:', data);

        console.log('3. Loading job template...');
        // Load and interpolate our pipeline template
        const templateResponse = await fetchWithAuth('job_template.xml');
        console.log('4. Template response status:', templateResponse.status);
        const templateText = await templateResponse.text();
        console.log('5. Template loaded, length:', templateText.length);
        
        let xml = templateText
          .replace(/\$\{DESCRIPTION\}/g, escapeXml(data.description))
          .replace(/\$\{SCRIPT\}/g, data.script)  // No escapeXml for script (CDATA)
          .replace(/\$\{GITHUB_HOOK_TRIGGER\}/g, 
            data.githubHook 
              ? `<com.cloudbees.jenkins.GitHubPushTrigger plugin="github@1.37.1"/>` 
              : ''
          );

        // Clean up whitespace but leave CDATA alone
        xml = cleanupXml(xml);
        console.log('6. XML generated, first 100 chars:', xml.substring(0, 100));

        console.log('7. Sending request to:', `${API}/job/${encodeURIComponent(jobName)}/config`);
        const requestBody = JSON.stringify({ xml });
        console.log('8. Request body (first 200 chars):', requestBody.substring(0, 200));
        
        const resp = await fetchWithAuth(`${API}/job/${encodeURIComponent(jobName)}/config`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: requestBody
        });
        
        console.log('9. Response status:', resp.status);
        const result = await resp.json().catch(e => ({}));
        console.log('10. Response data:', result);
        
        if (!resp.ok) {
          throw new Error(result.error || result.message || `HTTP ${resp.status}`);
        }

        showToast('Configuration saved successfully', 'success');
        closeModal('config-modal');
        await loadInitialData(); // Refresh the UI
      } catch (err) {
        console.error('Error saving config:', err);
        showToast('Failed to save configuration', 'error');
      } finally {
        // Always reset the button state
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }
    }

    function escapeXml(unsafe) {
      return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
        }
      });
    }

    function cleanupXml(xml) {
      // Remove empty lines and trim each line
      return xml.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
    }

    async function openRepo() {
      const infoEl = document.getElementById('repo-info');
      infoEl.innerHTML = '<p>Loading repository information...</p>';
      openModal('repo-modal');
      
      try {
        // Grab only the Git SCM section
        const scmMatch = configXml.match(/<scm[^>]*class="hudson\.plugins\.git\.GitSCM"([\s\S]*?)<\/scm>/);
        let gitUrl = 'N/A', branch = 'N/A', credentials = 'N/A';
        
        if (scmMatch) {
          const scmXml = scmMatch[1];
          const urlMatch = scmXml.match(/<url>([\s\S]*?)<\/url>/);
          const branchMatch = scmXml.match(/<name>([\s\S]*?)<\/name>/);
          const credMatch = scmXml.match(/<credentialsId>([\s\S]*?)<\/credentialsId>/);
          
          if (urlMatch) gitUrl = urlMatch[1].trim();
          if (branchMatch) branch = branchMatch[1].trim();
          if (credMatch) credentials = credMatch[1].trim();
        }
        
        infoEl.innerHTML = `
          <div class="form-group">
            <label class="form-label">Repository URL</label>
            <input class="form-control" value="${gitUrl}" readonly>
          </div>
          <div class="form-group">
            <label class="form-label">Branch</label>
            <input class="form-control" value="${branch}" readonly>
          </div>
          <div class="form-group">
            <label class="form-label">Credentials</label>
            <input class="form-control" value="${credentials}" readonly>
          </div>
        `;
      } catch (error) {
        console.error('Failed to load repo info:', error);
        infoEl.innerHTML = '<p>Failed to load repository information</p>';
      }
    }

    async function openStages() {
      openModal('stages-modal');
      const bar = document.getElementById('stages-bar');
      bar.innerHTML = '<div class="stages-container"><div class="stages-bar" id="pipeline-stages"></div></div>';
      const stagesContainer = document.getElementById('pipeline-stages');
      
      try {
        // First, check if this is a pipeline job
        const jobInfoResp = await fetchWithAuth(`${API}/job/${encodeURIComponent(jobName)}`);
        if (!jobInfoResp.ok) {
          if (jobInfoResp.status === 404) {
            throw new Error('Job not found or inaccessible');
          }
          throw new Error(`Failed to fetch job info: HTTP ${jobInfoResp.status}`);
        }
        
        const jobInfo = await jobInfoResp.json();
        const isPipeline = jobInfo._class && jobInfo._class.includes('WorkflowJob');
        
        if (!isPipeline) {
          bar.innerHTML = `
            <div class="freestyle-message">
              <i class="fas fa-info-circle"></i>
              <p>This job doesn't support pipeline stages.</p>
              <p>View build logs for execution details.</p>
            </div>
          `;
          return;
        }
        
        // Get the last build details
        const lastBuild = jobInfo.lastBuild;
        if (!lastBuild || !lastBuild.number) {
          throw new Error('No builds found for this job');
        }
        
        try {
          // Get the pipeline run details
          const buildDetails = await fetchWithAuth(
            `${API}/job/${encodeURIComponent(jobName)}/${lastBuild.number}/wfapi/describe`
          );
          
          if (!buildDetails.ok) {
            throw new Error('Pipeline details not available');
          }
          
          const pipelineData = await buildDetails.json();
          
          // Clear loading state
          stagesContainer.innerHTML = '';
          
          // Add stages to the container
          if (pipelineData.stages && pipelineData.stages.length > 0) {
            pipelineData.stages.forEach((stage, index) => {
              // Add connector between stages
              if (index > 0) {
                const connector = document.createElement('div');
                connector.className = `stage-connector ${stage.status === 'SUCCESS' ? 'active' : ''}`;
                stagesContainer.appendChild(connector);
              }
              
              // Format duration
              let duration = '';
              if (stage.durationMillis) {
                const seconds = Math.floor(stage.durationMillis / 1000);
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                duration = `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
              }
              
              // Create and append stage
              const stageEl = createStageElement(
                stage.name,
                stage.status,
                duration,
                stage.startTimeMillis
              );
              stagesContainer.appendChild(stageEl);
            });
          } else {
            throw new Error('No stage information available');
          }
        } catch (error) {
          console.warn('Could not load pipeline stages:', error.message);
          // Fallback to showing build status only
          stagesContainer.innerHTML = `

          `;
        }
        
        // For pipeline jobs, fetch and display stages
        const resp = await fetchWithAuth(`${API}/job/${encodeURIComponent(jobName)}/stages`);
        if (!resp.ok) {
          if (resp.status === 404) {
            throw new Error('This job has failed to build');
          }
          throw new Error(`HTTP ${resp.status}`);
        }
        
        const stages = await resp.json();
        bar.innerHTML = '';
        
        // Create connector element
        const connector = document.createElement('div');
        connector.className = 'stage-connector';
        bar.appendChild(connector);
        
        // Add start stage
        const startStage = createStageElement('Start', 'SUCCESS');
        bar.appendChild(startStage);
        
        // Add pipeline stages if any
        if (stages && stages.length > 0) {
          stages.forEach((stage, index) => {
            const stageEl = createStageElement(stage.name, stage.status || 'PENDING');
            bar.appendChild(stageEl);
            
            // Update connector for successful stages
            if (stage.status === 'SUCCESS') {
              connector.classList.add('active');
            }
          });
          
          // Add end stage
          const allStagesSuccess = stages.every(s => s.status === 'SUCCESS');
          const endStage = createStageElement('End', allStagesSuccess ? 'SUCCESS' : 'PENDING');
          bar.appendChild(endStage);
        } else {
          bar.innerHTML = '<p>No stage information available for this build.</p>';
        }
      } catch (error) {
        console.error('Failed to load stages:', error);
        bar.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${error.message || 'Failed to load build information'}</p>
          </div>
        `;
      }
    }

    function createStageElement(name, status = 'PENDING', duration = '', timestamp = '') {
      const stage = document.createElement('div');
      stage.className = `stage ${status}`;
      
      // Create stage circle with number
      const circle = document.createElement('div');
      circle.className = 'stage-circle';
      
      // Add status icon
      const statusIcon = document.createElement('i');
      if (status === 'SUCCESS') {
        statusIcon.className = 'fas fa-check';
      } else if (status === 'FAILED') {
        statusIcon.className = 'fas fa-times';
      } else if (status === 'IN_PROGRESS') {
        statusIcon.className = 'fas fa-spinner fa-spin';
      } else {
        statusIcon.className = 'fas fa-clock';
      }
      
      circle.appendChild(statusIcon);
      
      // Create stage name
      const stageName = document.createElement('div');
      stageName.className = 'stage-name';
      stageName.textContent = name;
      
      // Create stage time and duration container
      const stageInfo = document.createElement('div');
      stageInfo.className = 'stage-info';
      
      if (timestamp) {
        const timeEl = document.createElement('div');
        timeEl.className = 'stage-time';
        timeEl.textContent = formatTimeToHHMM(timestamp);
        stageInfo.appendChild(timeEl);
      }
      
      if (duration) {
        const durationEl = document.createElement('div');
        durationEl.className = 'stage-duration';
        durationEl.textContent = duration;
        stageInfo.appendChild(durationEl);
      }
      
      // Assemble the stage
      stage.appendChild(circle);
      stage.appendChild(stageName);
      stage.appendChild(stageInfo);
      
      stage.addEventListener('click', () => {
        showToast(`Stage: ${name} | Status: ${status}`, status.toLowerCase());
      });
      
      return stage;
    }

    async function loadPermalinks() {
      try {
        const sum = await (await fetchWithAuth(`${API}/job/${encodeURIComponent(jobName)}`)).json();
        const cont = document.getElementById('permalinks');
        cont.innerHTML = '';
        
        const last = sum.lastBuild;
        if (last) {
          const a = document.createElement('a');
          a.className = 'permalink';
          a.href = last.url;
          a.innerHTML = `
            <i class="fas fa-thumbtack"></i>
            <span>Last build (#${last.number}) - ${formatTime(last.timestamp)}</span>
          `;
          cont.appendChild(a);
        }
        
        const lastStable = sum.lastStableBuild;
        if (lastStable && lastStable.number !== last?.number) {
          const a = document.createElement('a');
          a.className = 'permalink';
          a.href = lastStable.url;
          a.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>Last stable build (#${lastStable.number}) - ${formatTime(lastStable.timestamp)}</span>
          `;
          cont.appendChild(a);
        }
        
        const lastFailed = sum.lastFailedBuild;
        if (lastFailed && lastFailed.number !== last?.number) {
          const a = document.createElement('a');
          a.className = 'permalink';
          a.href = lastFailed.url;
          a.innerHTML = `
            <i class="fas fa-times-circle"></i>
            <span>Last failed build (#${lastFailed.number}) - ${formatTime(lastFailed.timestamp)}</span>
          `;
          cont.appendChild(a);
        }
      } catch (error) {
        console.error('Failed to load permalinks:', error);
      }
    }

    async function loadBuilds() {
      try {
        const sum = await (await fetchWithAuth(`${API}/job/${encodeURIComponent(jobName)}`)).json();
        const builds = sum.builds || [];
        const listEl = document.getElementById('build-list');
        
        if (builds.length === 0) {
          listEl.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon"><i class="fas fa-inbox"></i></div>
              <div class="empty-text">No builds found for this job</div>
            </div>
          `;
          return;
        }
        
        listEl.innerHTML = '';
        
        for (const b of builds.slice(0, 10)) { // Limit to 10 most recent builds
          const detail = await (await fetchWithAuth(
            `${API}/job/${encodeURIComponent(jobName)}/build/${b.number}`)).json();
          
          const buildCard = document.createElement('div');
          buildCard.className = 'build-card fade-in';
          
          const statusClass = detail.result === 'SUCCESS' ? 'success' : 'failure';
          const statusIcon = detail.result === 'SUCCESS' ? 'fa-check-circle' : 'fa-times-circle';

          buildCard.innerHTML = `
            <div class="build-info">
              <div class="build-status ${statusClass}">
                <i class="fas ${statusIcon}"></i>
              </div>
              <div class="build-meta">
                <span class="build-number">Build #${detail.number}</span>
                <span class="build-time">${formatTime(detail.timestamp)}</span>
              </div>
            </div>
            <div class="build-duration">${formatDuration(detail.duration)}</div>
          `;
          
          buildCard.addEventListener('click', async () => {
            try {
              const logModal = document.getElementById('build-log-modal');
              const logEl = document.getElementById('build-log-content');
              logEl.textContent = 'Loading log...';

              openModal('build-log-modal');

              const logResp = await fetchWithAuth(`${API}/job/${encodeURIComponent(jobName)}/log/${detail.number}`);
              const logText = await logResp.text();

              logEl.textContent = logText;
            } catch (error) {
              console.error('Failed to load build log:', error);
              showToast('Failed to load build log', 'error');
            }
          });

          listEl.appendChild(buildCard);
          
          if (detail.number === sum.lastCompletedBuild?.number) {
            lastBuildStatus = detail.result;
            updateStatusBadge();
          }
        }
      } catch (error) {
        console.error('Failed to load builds:', error);
        document.getElementById('build-list').innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="empty-text">Failed to load build history</div>
          </div>
        `;
      }
    }

    function updateStatusBadge() {
      const statusEl = document.getElementById('status-icon');
      if (!statusEl) return;
      
      statusEl.className = 'status-badge';
      statusEl.innerHTML = '';
      
      const icon = document.createElement('i');
      
      if (lastBuildStatus === 'SUCCESS') {
        statusEl.classList.add('success');
        icon.className = 'fas fa-check-circle';
      } else if (lastBuildStatus === 'FAILURE') {
        statusEl.classList.add('failure');
        icon.className = 'fas fa-times-circle';
      } else {
        statusEl.classList.add('pending');
        icon.className = 'fas fa-ellipsis-h';
      }
      
      statusEl.appendChild(icon);
    }

    async function triggerBuild() {
      const btn = document.getElementById('build-now-btn');
      const originalText = btn.innerHTML;
      
      try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Building...</span>';
        
        const r = await fetchWithAuth(`${API}/job/${encodeURIComponent(jobName)}/build`, { 
          method: 'POST' 
        });
        
        if (!r.ok) throw new Error(r.status);
        
        showToast('Build queued successfully', 'success');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay for UX
        await loadPermalinks();
        await loadBuilds();
      } catch (error) {
        console.error('Build failed:', error);
        showToast('Failed to queue build', 'error');
      } finally {
        btn.innerHTML = originalText;
      }
    }

    async function openHook() {
      openModal('hook-modal');
      
      // Initialize music player
      const music = document.getElementById('background-music');
      
      // Play music when modal opens
      if (music) {
        music.currentTime = 0; // Rewind to start
        const playPromise = music.play();
        
        // Handle autoplay restrictions
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Autoplay prevented:', error);
            // Show a message or handle the error as needed
          });
        }
      }
      
      // Pause music when modal is closed
      document.getElementById('cancel-hook').addEventListener('click', () => {
        if (music) {
          music.pause();
          music.currentTime = 0;
        }
      }, { once: true }); // Use { once: true } to prevent multiple listeners
    }

    async function deleteJob() {
      try {
        const resp = await fetchWithAuth(`${API}/job/${encodeURIComponent(jobName)}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!resp.ok) {
          const error = await resp.json().catch(() => ({}));
          throw new Error(error.message || `HTTP ${resp.status}`);
        }
        
        showToast('Project deleted successfully', 'success');
        setTimeout(() => {
          window.location.href = 'jenkins_dashboard.html'; // Redirect to job list
        }, 1500);
      } catch (error) {
        console.error('Delete failed:', error);
        showToast('Failed to delete project', 'error');
      } finally {
        closeModal('delete-modal');
      }
    }

    async function renameJob() {
      const newName = document.getElementById('rename-input').value.trim();
      
      if (!newName) {
        showToast('Please enter a new name', 'error');
        return;
      }
      
      if (newName === jobName) {
        showToast('New name must be different', 'info');
        return;
      }
      
      try {
        const resp = await fetchWithAuth(`${API}/job/${encodeURIComponent(jobName)}/rename`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newName })
        });
        
        if (!resp.ok) throw new Error(resp.status);
        
        showToast(`Project renamed to ${newName}`, 'success');
        setTimeout(() => {
          window.location.href = `job_details.html?job=${encodeURIComponent(newName)}`;
        }, 1500);
      } catch (error) {
        console.error('Rename failed:', error);
        showToast('Failed to rename project', 'error');
      } finally {
        closeModal('rename-modal');
      }
    }
document.addEventListener('DOMContentLoaded', () => {
  // Add format button functionality
  const formatBtn = document.getElementById('cfg-btn-format');
  if (formatBtn) {
    formatBtn.addEventListener('click', () => {
      const textarea = document.getElementById('cfg-script');
      textarea.value = formatScript(textarea.value);
      updateCfgLineNumbers();
    });
  }

  // 1) Your Jenkins proxy base
  const PROXY = 'http://localhost:3000/jenkins';

  // 2) Grab the job name from the URL (?job=…)
  const params = new URLSearchParams(window.location.search);
  const job    = params.get('job');

  // 3) Cache DOM elements
  const navWorkspaceBtn = document.getElementById('nav-workspace');
  const modal           = document.getElementById('jenkins-modal');
  const iframe          = document.getElementById('jenkins-iframe');
  const closeBtns       = document.querySelectorAll('.close-jenkins');

  // sanity check
  console.log('⚙️  nav-workspace button:', navWorkspaceBtn);
  console.log('⚙️  modal element:', modal);

  // 4) Show the modal + load the iframe
  navWorkspaceBtn.addEventListener('click', () => {
    if (!job) {
      return alert('No job specified in the URL!');
    }
    console.log('▶️  Opening workspace for job:', job);
    iframe.src = `${PROXY}/job/${encodeURIComponent(job)}/ws/`;
    modal.classList.add('active');
  });

  // 5) Hide the modal + unload the iframe
  closeBtns.forEach(btn =>
    btn.addEventListener('click', () => {
      console.log('❌  Closing modal');
      modal.classList.remove('active');
      iframe.src = '';
    })
  );

 navWorkspaceBtn.addEventListener('click', async () => {
  const workspaceModal = document.getElementById('workspace-modal');
  const workspaceEl = document.getElementById('workspace-content');
  workspaceEl.textContent = 'Loading workspace...';

  openModal('workspace-modal');

  try {
    const resp = await fetchWithAuth(`${API}/job/${encodeURIComponent(jobName)}/workspace`);

    if (resp.status === 404) {
      workspaceEl.textContent = 'No workspace found. Has this job been built yet?';
      return;
    }

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const contentType = resp.headers.get('content-type');
    if (contentType.includes('application/json')) {
      const json = await resp.json();
      workspaceEl.textContent = JSON.stringify(json, null, 2);
    } else {
      const html = await resp.text();
      workspaceEl.innerHTML = html;
    }
  } catch (err) {
    console.error('Failed to load workspace:', err);
    workspaceEl.textContent = 'Failed to load workspace.';
    showToast('Failed to load workspace', 'error');
  }
});


});

// Add this after the build card click handler
document.getElementById('build-iframe').addEventListener('load', function() {
  try {
    // Check if the iframe loaded successfully
    if (this.contentWindow.location.href === 'about:blank') return;
    
    // Hide fallback if iframe loaded
    document.getElementById('iframe-fallback').style.display = 'none';
  } catch (e) {
    // Handle cross-origin errors
    showFallback();
  }
});

function showFallback() {
  const iframe = document.getElementById('build-iframe');
  const fallback = document.getElementById('iframe-fallback');
  const externalLink = document.getElementById('build-external-link');
  
  iframe.style.display = 'none';
  fallback.style.display = 'block';
  externalLink.href = iframe.src.replace('/jenkins', '');
}

// Add refresh button handler
document.getElementById('refresh-build').addEventListener('click', function() {
  const iframe = document.getElementById('build-iframe');
  iframe.src = iframe.src; // Reload the iframe
});

document.getElementById('close-build-log').addEventListener('click', () => {
  closeModal('build-log-modal');
});
document.getElementById('close-workspace').addEventListener('click', () => {
  closeModal('workspace-modal');
});

    // Initialize the app when DOM is loaded
    document.addEventListener('DOMContentLoaded', init);

// Helper function to fetch with Authorization header
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('accessToken');
  const headers = {
    ...(options.headers || {}),
    'Authorization': `Bearer ${token}`
  };
  return fetch(url, { ...options, headers });
}