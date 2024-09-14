// 监听侧边栏切换按钮的点击事件
document.querySelector('.sidebar-toggle').addEventListener('click', function() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('show');
    
    // 当侧边栏显示时，确保所有选项折叠起来
    if (sidebar.classList.contains('show')) {
        document.querySelectorAll('.collapsible').forEach(function(collapsible) {
            collapsible.classList.remove('active');
            collapsible.nextElementSibling.classList.remove('show');
        });
    }

    // Toggle the content width when the sidebar is visible
    if (sidebar.classList.contains('show')) {
        document.querySelector('.content').classList.add('sidebar-visible');
    } else {
        document.querySelector('.content').classList.remove('sidebar-visible');
    }
});

// 监听侧边栏内选项的点击事件
document.querySelectorAll('.sidebar a').forEach(function(link) {
    link.addEventListener('click', function() {
        // 在选择完选项后自动关闭侧边栏（移动端）
        if (window.innerWidth <= 768) {
            document.querySelector('.sidebar').classList.remove('show');
            document.querySelector('.content').classList.remove('sidebar-visible');
        }
    });
});

// 监听可折叠标题的点击事件
document.querySelectorAll('.collapsible').forEach(function(collapsible) {
    collapsible.addEventListener('click', function() {
        this.classList.toggle('active');
        this.nextElementSibling.classList.toggle('show');
    });
});

