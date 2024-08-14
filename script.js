// 监听侧边栏切换按钮的点击事件
document.querySelector('.sidebar-toggle').addEventListener('click', function() {
    document.querySelector('.sidebar').classList.toggle('show');
});

// 监听侧边栏内选项的点击事件
document.querySelectorAll('.sidebar a').forEach(function(link) {
    link.addEventListener('click', function() {
        // 在选择完选项后自动关闭侧边栏（移动端）
        if (window.innerWidth <= 768) {
            document.querySelector('.sidebar').classList.remove('show');
        }
    });
});

// 监听可折叠标题的点击事件
document.querySelectorAll('.collapsible').forEach(function(collapsible) {
    collapsible.addEventListener('click', function() {
        this.nextElementSibling.classList.toggle('show');
    });
});
