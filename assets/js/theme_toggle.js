(function() {
    var savedTheme = localStorage.getItem('theme') || 'star';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();