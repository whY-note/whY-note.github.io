
// 主题切换功能
(function() {
	var THEME_KEY = 'theme';
	var STAR_THEME = 'star';
	var WHITE_THEME = 'white';
	var MOON_ICON = '/assets/images/theme/moon.png';
	var SUN_ICON = '/assets/images/theme/sun.png';

	function getTheme() {
		var current = document.documentElement.getAttribute('data-theme');
		if (current === STAR_THEME || current === WHITE_THEME) {
			return current;
		}
		var saved = localStorage.getItem(THEME_KEY);
		return saved === WHITE_THEME ? WHITE_THEME : STAR_THEME;
	}

	function applyTheme(theme) {
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem(THEME_KEY, theme);

		var toggleBtn = document.getElementById('themeToggle');
		var icon = document.getElementById('themeToggleIcon');
		if (toggleBtn && icon) {
			if (theme === STAR_THEME) {
				icon.src = MOON_ICON;
				toggleBtn.setAttribute('aria-label', '切换到白色主题');
				toggleBtn.setAttribute('title', '当前: 星空主题');
			} else {
				icon.src = SUN_ICON;
				toggleBtn.setAttribute('aria-label', '切换到星空主题');
				toggleBtn.setAttribute('title', '当前: 白色主题');
			}
			toggleBtn.setAttribute('aria-pressed', theme === WHITE_THEME ? 'true' : 'false');
		}
	}

	document.addEventListener('DOMContentLoaded', function() {
		applyTheme(getTheme());

		var toggleBtn = document.getElementById('themeToggle');
		if (!toggleBtn) {
			return;
		}

		toggleBtn.addEventListener('click', function() {
			var nextTheme = getTheme() === STAR_THEME ? WHITE_THEME : STAR_THEME;
			applyTheme(nextTheme);
		});
	});
})();