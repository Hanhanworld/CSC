// 监听侧边栏切换按钮的点击事件
document.querySelector('.sidebar-toggle').addEventListener('click', function() {
    document.querySelector('.sidebar').classList.toggle('show');
});

// 监听侧边栏内选项的点击事件
document.querySelectorAll('.sidebar a').forEach(function(link) {
    link.addEventListener('click', function() {
        // 在选择完选项后自动关闭侧边栏
        document.querySelector('.sidebar').classList.remove('show');
    });
});
