// Enhanced menu data structure
// This script handles the sidebar menu, theme toggle, user dropdown, and other UI interactions
    const api_url = "ttp://localhost:3000/api"
// Logout functionality

        document.getElementById('logout-btn').addEventListener('click', async e => {
            e.preventDefault();

            try {
                const res = await fetch('http://localhost:3000/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Logout failed');
            } catch (err) {
                alert(err.message);
            } finally {
                // Remove token and user info
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
                // Redirect to login
                window.location.replace('login.html');
            }
        });
      
      
        const menuData = {
    admin: [
        {
            header: "GENERAL",
            items: [
                {
                    label: "Dashboard",
                    icon: "fas fa-tachometer-alt", // Dashboard icon
                    page: "admin-dashboard.html",
                    headerText: "Dashboard",
                    badge: null
                }
            ]
        },
        {
            header: "ADMIN CONTROL",
            items: [
                
                
                {
                    label: "Manage Users", // Updated label
                    icon: "fas fa-users-cog", // Icon remains fas fa-users-cog
                    page: "create_account.html",
                    headerText: "Manage Users", // Updated headerText
                }
               
                
                
            ]
        },
        {
            header: "SYSTEM",
            items: [
                {
                    label: "Settings", // Updated label
                    icon: "fas fa-cogs", // Updated icon
                    page: "settings.html",
                    headerText: "Settings",
                    badge: null
                },
       
            ]
        }
    ],
    developpeur: [
        {
            header: "GENERAL",
            items: [
                {
                    label: "Dashboard",
                    icon: "fas fa-tachometer-alt", // Dashboard icon
                    page: "developer_dashboard.html",
                    headerText: "Dashboard",
                    badge: null
                },
            ]
        },
        {
            header: "THESIS",
            items: [
                {
                    label: "Repostry Tracker",
                    icon: "fas fa-code-branch", // repositories icon
                    page: "github_tracker.html",
                    headerText: "Repostry Tracker",
                    badge: null
                },
                {
                    label: "Github Explorer",
                    icon: "fab fa-github", // Github icon
                    page: "github_dashboard.html",
                    headerText: "Github Explorer",
                    badge: null
                },
            
              
            ]
        },
        {
            header: "SYSTEM",
            items: [
                {
                    label: "User Settings", // Updated label
                    icon: "fas fa-user-cog", // Updated icon
                    page: "settings.html",
                    headerText: "User Settings", // Updated headerText
                    badge: null
                },
       
            ]
        }
    ],
    professional_devops: [
        {
            header: "GENERAL",
            items: [
                {
                    label: "Dashboard",
                    icon: "fas fa-tachometer-alt", // Dashboard icon
                    page: "devops_dashboard.html",
                    headerText: "Dashboard",
                    badge: null
                }
            ]
        },
        {
            header: "TOOLS",
            items: [
                {
                    label: "Jenkins",
                    icon: "fa-brands fa-jenkins", // Jenkins official icon
                    page: null,
                    headerText: "Jenkins",
                    submenu: [
                        {
                            label: "Create New Job",
                            page: "new_item.html",
                            headerText: "Jenkins / Create Job"
                        },
                        {
                            label: "Manage Jobs",
                            page: "jenkins_dashboard.html",
                            headerText: "Jenkins / Manage Jobs"
                        }
                    ]
                },
                {
                    label: "Nexus",
                    icon: "fas fa-cubes", // Nexus Repository logo
                    page: "nexus_dashboard.html",
                    headerText: "Nexus",
                },
                {
                    label: "Docker Hub",
                    icon: "fab fa-docker", // Docker official icon
                    page: "dockerhub_dashboard.html",
                    headerText: "Docker Hub",
                },
                {
                    label: "SonarQube",
                    icon: "fas fa-wave-square", // SonarQube logo
                    page: "sonarqube_dashboard.html",
                    headerText: "SonarQube",
                }
            ]
        },
        {
            header: "SYSTEM",
            items: [
                {
                    label: "User Settings",
                    icon: "fas fa-user-cog",
                    page: "settings.html",
                    headerText: "User Settings",
                    badge: null
                }
            ]
        }
    ],
    superviseur: [
        {
            header: "GENERAL",
            items: [
                {
                    label: "Supervisor Dashboard", // Updated Label
                    icon: "fas fa-user-shield",    // Updated Icon
                    page: "supervisor_dashboard.html", // Updated Page
                    headerText: "Supervisor Dashboard", // Updated Header Text
                    badge: null
                }
            ],
        },
        {
            header: "TOOLS",
            items: [
                {
                    label: "Prometheus",
                    icon: "fas fa-fire", // Changed to a more common Prometheus icon representation
                    page: "prometheus_dashboard.html",
                    headerText: "Prometheus",
                    badge: null
                },
                {
                    label: "Kubernetes", 
                    icon: "fas fa-dharmachakra", 
                    page: "kubernetes_dashboard.html", 
                    headerText: "Kubernetes",
                    badge: null
                }
            ],
        },
        {
            header: "SYSTEM",
            items: [
                {
                    label: "User Settings",
                    icon: "fas fa-user-cog",
                    page: "settings.html",
                    headerText: "User Settings",
                    badge: null
                }
            ]
        }
    ],
};

        // DOM Elements
        const menuContainer = document.getElementById('menu-container');
        const breadcrumbList = document.querySelector('.breadcrumb');
        const contentFrame = document.querySelector('iframe[name="content-frame"]');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const menuToggleButton = document.getElementById('menu-toggle');
        const themeToggleButton = document.getElementById('theme-toggle');
        const userDropdownButton = document.querySelector('.user-btn');
        const userDropdownMenu = document.querySelector('.dropdown-menu');
        const notificationDropdownButton = document.querySelector('.notification-dropdown-trigger button');
        const notificationDropdown = document.querySelector('.notification-dropdown');
        const notificationClearButton = document.querySelector('.notification-clear');
        const searchInput = document.querySelector('.search-input');
        
        // Robustly parse user data from localStorage
        let user = {}; // Default to an empty object
        const userString = localStorage.getItem('user');
        if (userString && userString !== 'null' && userString !== 'undefined') {
            try {
                const parsedUser = JSON.parse(userString);
                if (parsedUser && typeof parsedUser === 'object') {
                    user = parsedUser;
                }
            } catch (error) {
                console.error('Error parsing user data from localStorage in index.js:', error);
            }
        }
        
        const userRole = user.role; // Safely access role, will be undefined if user or user.role doesn't exist
        console.log('User role from index.js:', userRole);
        if (!userRole) {
            console.error('User role not found or user data is invalid in index.js');
        }

        // Initialize the application
        function init() {
            generateMenu(menuData, menuContainer, userRole);
            setupEventListeners();
            setActiveMenuItem();
            loadThemePreference();
        }
        
        // Generate menu based on user role
        function generateMenu(data, container, role) {
            container.innerHTML = '';
            
            if (!data[role]) {
                console.error(`No menu configuration found for role: ${role}`);
                return;
            }
            
            data[role].forEach(section => {
                // Add section header
                const headerHTML = `
                    <li class="menu-header px-4 py-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        ${section.header}
                    </li>
                `;
                container.insertAdjacentHTML('beforeend', headerHTML);
                
                // Add menu items
                section.items.forEach(item => {
                    let menuItemHTML;
                    
                    if (item.submenu) {
                        // Item with submenu
                        menuItemHTML = `
                            <li class="menu-item" data-page="${item.page || ''}">
                                <a href="#" class="menu-link">
                                    <i class="menu-icon ${item.icon}"></i>
                                    <span>${item.label}</span>
                                    ${item.badge ? `<span class="menu-badge">${item.badge}</span>` : ''}
                                    <i class="menu-arrow fas fa-chevron-down"></i>
                                </a>
                                <ul class="submenu">
                                    ${item.submenu.map(subItem => `
                                        <li class="submenu-item" data-page="${subItem.page}">
                                            <a href="${subItem.page}" 
                                               class="submenu-link" 
                                               target="content-frame" 
                                               data-breadcrumb="${subItem.headerText}">
                                                ${subItem.label}
                                                ${subItem.badge ? `<span class="menu-badge">${subItem.badge}</span>` : ''}
                                            </a>
                                        </li>
                                    `).join('')}
                                </ul>
                            </li>
                        `;
                    } else {
                        // Single item
                        menuItemHTML = `
                            <li class="menu-item" data-page="${item.page}">
                                <a href="${item.page}" 
                                   class="menu-link" 
                                   target="content-frame" 
                                   data-breadcrumb="${item.headerText}">
                                    <i class="menu-icon ${item.icon}"></i>
                                    <span>${item.label}</span>
                                    ${item.badge ? `<span class="menu-badge">${item.badge}</span>` : ''}
                                </a>
                            </li>
                        `;
                    }
                    
                    container.insertAdjacentHTML('beforeend', menuItemHTML);
                });
            });
        }
        
        // Set up all event listeners
        function setupEventListeners() {
            // Menu toggle for mobile
            menuToggleButton.addEventListener('click', toggleSidebar);
            
            // Theme toggle
            themeToggleButton.addEventListener('click', toggleTheme);
            
            // User dropdown
            userDropdownButton.addEventListener('click', toggleUserDropdown);
            
            // Notification dropdown
            notificationDropdownButton.addEventListener('click', toggleNotificationDropdown);
            
            // Clear notifications
            notificationClearButton.addEventListener('click', clearNotifications);
            
            // Close dropdowns when clicking outside
            document.addEventListener('click', (e) => {
                if (!userDropdownButton.contains(e.target) && !userDropdownMenu.contains(e.target)) {
                    userDropdownMenu.classList.remove('show');
                }
                
                if (!notificationDropdownButton.contains(e.target) && !notificationDropdown.contains(e.target)) {
                    notificationDropdown.classList.remove('show');
                }
            });
            
            // Search functionality
            if (searchInput) {
                searchInput.addEventListener('input', debounce(handleSearch, 300));
            }
            
            // Iframe load event
            if (contentFrame) {
                contentFrame.addEventListener('load', updateBreadcrumbFromFrame);
            }
            
            // Handle menu item clicks
            document.addEventListener('click', (e) => {
                // Handle menu links with submenus
                if (e.target.closest('.menu-link') && e.target.closest('.menu-item')) {
                    const menuItem = e.target.closest('.menu-item');
                    const submenu = menuItem.querySelector('.submenu');

                    if (submenu) {
                        e.preventDefault(); // Prevent default link behavior
                        menuItem.classList.toggle('active'); // Toggle active class
                        submenu.classList.toggle('show'); // Toggle submenu visibility

                        // Close other open submenus
                        document.querySelectorAll('.menu-item.active').forEach(item => {
                            if (item !== menuItem) {
                                item.classList.remove('active');
                                const otherSubmenu = item.querySelector('.submenu');
                                if (otherSubmenu) {
                                    otherSubmenu.classList.remove('show');
                                }
                            }
                        });
                    }
                }
            });
            
            // Handle window resize
            window.addEventListener('resize', handleResize);
        }
        
        // Toggle sidebar visibility
        function toggleSidebar() {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        }
        
        // Toggle dark/light theme
        function toggleTheme() {
            const html = document.documentElement;
            const isDark = html.classList.contains('dark');
            let newTheme;
            
            if (isDark) {
                html.classList.remove('dark');
                newTheme = 'light';
                localStorage.setItem('theme', newTheme);
            } else {
                html.classList.add('dark');
                newTheme = 'dark';
                localStorage.setItem('theme', newTheme);
            }
            notifyIframeThemeChange(newTheme); // Notify active iframe
        }
        
        // Load user's theme preference
        function loadThemePreference() {
            const preferredTheme = localStorage.getItem('theme') || 
                                 (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            
            if (preferredTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            // Initial theme sync with iframe will be handled by iframe's 'requestInitialTheme' message
        }

        // Helper function to notify the active iframe of theme changes
        function notifyIframeThemeChange(theme) {
            const iframe = document.getElementById('content-frame'); // Ensure this ID matches your iframe
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({ type: 'themeChange', theme: theme }, '*');
            }
        }

        // Listen for theme requests from iframes
        window.addEventListener('message', function(event) {
            console.log('Parent received message:', event.data);
            // Add origin check for security if your iframe source is fixed
            // if (event.origin !== 'http://your-iframe-origin.com') {
            //     console.log('Message origin not allowed:', event.origin);
            //     return;
            // }
            if (event.data && event.data.type === 'requestInitialTheme') {
                const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
                console.log('Sending theme to iframe:', currentTheme);
                if (event.source) { // event.source is the iframe's window object
                    try {
                        event.source.postMessage({ type: 'themeChange', theme: currentTheme }, '*');
                        console.log('Theme sent to iframe successfully');
                    } catch (error) {
                        console.error('Error sending theme to iframe:', error);
                    }
                } else {
                    console.warn('No event.source available to send theme to iframe');
                }
            } else if (event.data) {
                console.log('Received non-theme message from iframe:', event.data);
            }
        });
        
        console.log('Parent message listener initialized');

        // Toggle user dropdown
        function toggleUserDropdown(e) {
            e.stopPropagation();
            userDropdownMenu.classList.toggle('show');
            notificationDropdown.classList.remove('show');
        }
        
        // Toggle notification dropdown
        function toggleNotificationDropdown(e) {
            e.stopPropagation();
            notificationDropdown.classList.toggle('show');
            userDropdownMenu.classList.remove('show');
        }
        
        // Clear all notifications
        function clearNotifications() {
            document.querySelectorAll('.notification-item.unread').forEach(item => {
                item.classList.remove('unread');
            });
            notificationDropdown.classList.remove('show');
        }
        
        // Handle search with debounce
        function handleSearch(e) {
            const query = e.target.value.trim();
            if (query.length > 2) {
                console.log('Searching for:', query);
                // Implement actual search functionality here
            }
        }
        
        // Debounce function for search
        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }
        
        // Update breadcrumb from iframe content
        function updateBreadcrumbFromFrame() {
            try {
                const currentURL = contentFrame.contentWindow.location.href;
                const pageName = currentURL.substring(currentURL.lastIndexOf('/') + 1).replace('.html', '').replace(/_/g, ' ');
                const formattedPageName = pageName.split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
                
                updateBreadcrumb(formattedPageName);
            } catch (e) {
                console.log('Could not access iframe URL due to CORS');
            }
        }
        
        // Update breadcrumb navigation
        function updateBreadcrumb(pageName) {
            // Clear existing breadcrumb items except Home
            const items = breadcrumbList.querySelectorAll('.breadcrumb-item:not(:first-child)');
            items.forEach(item => item.remove());
            
            // Split the page name into parts if it contains slashes
            const parts = pageName.split(' / ');
            
            parts.forEach((part, index) => {
                const item = document.createElement('div');
                item.className = 'breadcrumb-item';
                
                if (index < parts.length - 1) {
                    const link = document.createElement('a');
                    link.href = '#';
                    link.className = 'breadcrumb-link';
                    link.textContent = part;
                    item.appendChild(link);
                } else {
                    item.textContent = part;
                }
                
                breadcrumbList.appendChild(item);
            });
        }
        
        // Set active menu item based on current page
        function setActiveMenuItem(page = null) {
            // Clear all active states
            document.querySelectorAll('.menu-item').forEach(item => {
                item.classList.remove('active');
            });
            
            if (!page) {
                try {
                    page = contentFrame.contentWindow.location.href;
                    page = page.substring(page.lastIndexOf('/') + 1);
                } catch (e) {
                    console.log('Could not access iframe URL due to CORS');
                    return;
                }
            }
            
            // Find and activate the matching menu item
            const menuItems = document.querySelectorAll('.menu-item[data-page]');
            menuItems.forEach(item => {
                if (item.getAttribute('data-page') === page) {
                    item.classList.add('active');
                    
                    // If this is a submenu item, also activate its parent
                    const parentMenu = item.closest('.submenu');
                    if (parentMenu) {
                        parentMenu.previousElementSibling.closest('.menu-item').classList.add('active');
                        parentMenu.classList.add('show');
                    }
                }
            });
            
            // Also check submenu items
            const submenuLinks = document.querySelectorAll('.submenu-link');
            submenuLinks.forEach(link => {
                if (link.getAttribute('href') === page) {
                    link.closest('.menu-item').classList.add('active');
                    link.closest('.submenu').classList.add('show');
                }
            });
        }
        
        // Handle window resize
        function handleResize() {
            if (window.innerWidth < 1024) {
                sidebar.classList.add('collapsed');
                mainContent.classList.add('expanded');
            } else {
                sidebar.classList.remove('collapsed');
                mainContent.classList.remove('expanded');
            }
        }
        
        // Initialize the application
        document.addEventListener('DOMContentLoaded', init);

        function showToast(message = "Operation completed successfully.", type = "Success") {
  const toastEl = document.getElementById('success-toast');
  const toastBody = toastEl?.querySelector('.toast-body');
  const toastTitle = document.getElementById('toast-title');
  const toastIcon = document.getElementById('toast-icon');

  if (!toastEl || !toastBody || !toastTitle || !toastIcon) {
    console.error("Toast elements not found in DOM.");
    return;
  }

  // Remove background classes
  toastEl.classList.remove("bg-success", "bg-danger", "bg-warning", "bg-info", "bg-secondary");

  // Update based on type
  switch (type) {
    case "Success":
      toastEl.classList.add("bg-success");
      toastTitle.textContent = "Success";
      toastIcon.className = "bx bxs-check-square me-2";
      break;
    case "error":
      toastEl.classList.add("bg-danger");
      toastTitle.textContent = "Error";
      toastIcon.className = "bx bxs-x-circle me-2";
      break;
    case "warning":
      toastEl.classList.add("bg-warning");
      toastTitle.textContent = "Warning";
      toastIcon.className = "bx bxs-error-circle me-2";
      break;
    case "info":
      toastEl.classList.add("bg-info");
      toastTitle.textContent = "Info";
      toastIcon.className = "bx bxs-info-circle me-2";
      break;
    default:
      toastEl.classList.add("bg-secondary");
      toastTitle.textContent = "Notice";
      toastIcon.className = "bx bxs-bell me-2";
  }

  toastBody.textContent = message;
  const newToast = new bootstrap.Toast(toastEl, { delay: 2000 });
  newToast.show();
}
