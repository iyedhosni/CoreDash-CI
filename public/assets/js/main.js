document.addEventListener('DOMContentLoaded', () => {
    const menuContainer = document.getElementById('menu-container');
    const layoutMenu = document.getElementById('layout-menu'); // For Sneat template compatibility
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Determine active page for highlighting menu item
    const currentPage = window.location.pathname.split('/').pop(); // e.g., 'index.html', 'settings.html'

    // Define menu items
    // Icons are Font Awesome (fas) or Boxicons (bx) based on your existing HTML
    const menuItems = [
        { href: 'index.html', iconClass: 'fas fa-tachometer-alt', text: 'Dashboard' },
        { href: 'admin-dashboard.html', iconClass: 'fas fa-user-shield', text: 'Admin Dashboard', roles: ['admin'] }, // Example admin-only link
        { href: 'profile.html', iconClass: 'fas fa-user-circle', text: 'Profile' }, // Placeholder, you might have this
        { href: 'settings.html', iconClass: 'fas fa-cog', text: 'Settings' },
        // Add more menu items here as needed
    ];

    function generateMenuItemHTML(item) {
        const isActive = currentPage === item.href;
        // Using Tailwind-like classes as seen in index.html for sidebar menu items
        // Modify classes if your actual sidebar styling is different
        return `
            <li class="menu-item ${isActive ? 'active bg-gray-700 dark:bg-gray-700' : ''}">
                <a href="${item.href}" class="menu-link flex items-center px-4 py-2.5 text-sm font-medium rounded-md hover:bg-gray-700 dark:hover:bg-gray-700 transition-colors duration-150">
                    <i class="${item.iconClass} w-5 h-5 mr-3"></i>
                    <span>${item.text}</span>
                </a>
            </li>
        `;
    }
    
    let finalMenuItemsHTML = '';
    menuItems.forEach(item => {
        if (!item.roles || (user && user.role && item.roles.includes(user.role))) {
            finalMenuItemsHTML += generateMenuItemHTML(item);
        }
    });

    if (menuContainer) {
        menuContainer.innerHTML = finalMenuItemsHTML;
    } else if (layoutMenu) { // Fallback for Sneat-like template structure if #menu-container is inside #layout-menu
        const ul = layoutMenu.querySelector('ul.menu-inner, ul.menu'); // Adjust selector if needed
        if (ul) {
            ul.innerHTML = finalMenuItemsHTML;
        } else {
            // If no ul.menu is found, append one. This is a basic fallback.
            const newUl = document.createElement('ul');
            newUl.className = 'menu-inner py-1'; // Sneat class, adjust as needed
            newUl.innerHTML = finalMenuItemsHTML;
            layoutMenu.appendChild(newUl);
            console.log('Appended new UL to layout-menu for settings.html');
        }
    } else {
        console.warn('#menu-container or #layout-menu not found. Menu not loaded.');
    }

    // --- User Info in Sidebar Footer (from index.html) ---
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const sidebarName = document.getElementById('sidebar-name');
    const sidebarEmail = document.getElementById('sidebar-email');

    if (user && user.id) { // Check if user object and id exist
        if (sidebarAvatar && user.firstName) {
            sidebarAvatar.textContent = user.firstName.charAt(0).toUpperCase();
        }
        if (sidebarName && user.firstName && user.lastName) {
            sidebarName.textContent = `${user.firstName} ${user.lastName}`;
        }
        if (sidebarEmail && user.email) {
            sidebarEmail.textContent = user.email;
        }
    } else {
        // Handle case where user is not logged in or data is missing
        // For example, redirect to login or show 'Guest'
        if (sidebarName) sidebarName.textContent = 'Guest';
        if (sidebarEmail) sidebarEmail.textContent = '';
        if (window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html') {
           // window.location.href = '/login.html'; // Optional: redirect if not on auth pages
        }
    }

    // --- Theme Toggle (from index.html) ---

    // --- Menu Toggle for Mobile (from index.html) ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar'); // Assuming your sidebar has class 'sidebar'
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open'); // Add/remove 'open' class to show/hide
                                            // Ensure your CSS handles .sidebar.open
        });
    }


    // --- Navbar loading for Sneat (if you use it in settings.html) ---
    // This is a simplified version. For full Sneat functionality, more is needed.
    const layoutNavbar = document.getElementById('layout-navbar');
    if (layoutNavbar && typeof menu !== 'undefined' && menu._bindNavbar) { // menu is from Sneat's menu.js
        // This part is tricky without knowing if settings.html loads Sneat's menu.js
        // If settings.html is simpler and doesn't use Sneat's full JS, this might not be needed
        // or might need a different approach.
        console.log('Attempting to bind navbar if Sneat menu object exists.');
    }

});
