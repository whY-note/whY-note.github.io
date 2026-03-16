---
layout: default
title: Blog
permalink: /blog/
description: Blog of Haowen Yan.
keywords: Haowen Yan, haowen yan, 严浩文, Yan Haowen, yan haowen, yanhaowen, haowenyan, Yhw, yhw, whY, whY-note, Sun Yat-Sen University, SYSU, blog, Blog
image: /assets/images/og-blog.png
seo_type: website
---

<div class="blog-page">

<div class="blog-header">
    <a href="/" class="back-btn">
    <span class="arrow">
        &laquo;
    </span>
    Back
    </a>
</div>

<section data-aos="fade-up" markdown="1">

# Blog

<div class="blog-carousel" aria-label="Blog tag selector">
    <button class="blog-nav-btn" id="blogPrevBtn" type="button" aria-label="Previous tag">
        <span aria-hidden="true">&lt;</span>
    </button>

    <div class="blog-tag-stage" id="blogTagStage">
        <button class="blog-tag-card blog-tag-card-left" data-slot="left" type="button"></button>
        <button class="blog-tag-card blog-tag-card-center" data-slot="center" type="button"></button>
        <button class="blog-tag-card blog-tag-card-right" data-slot="right" type="button"></button>
    </div>

    <button class="blog-nav-btn" id="blogNextBtn" type="button" aria-label="Next tag">
        <span aria-hidden="true">&gt;</span>
    </button>
</div>

<ul class="blog-tag-index" id="blogTagIndex" aria-label="Tag list"></ul>

<section class="blog-detail" id="blogDetail" aria-live="polite"></section>

<script id="blogTagData" type="application/json">{{ site.data.blog_tags | jsonify }}</script>
<script>
(function () {
    var dataEl = document.getElementById('blogTagData');
    if (!dataEl) {
        return;
    }

    var tagGroups;
    try {
        tagGroups = JSON.parse(dataEl.textContent || '[]');
    } catch (err) {
        tagGroups = [];
    }
    if (!Array.isArray(tagGroups) || tagGroups.length === 0) {
        return;
    }

    var prevBtn = document.getElementById('blogPrevBtn');
    var nextBtn = document.getElementById('blogNextBtn');
    var stage = document.getElementById('blogTagStage');
    var indexList = document.getElementById('blogTagIndex');
    var detailPanel = document.getElementById('blogDetail');
    var cardButtons = stage ? stage.querySelectorAll('.blog-tag-card') : [];
    var activeIndex = 0;

    function normalizeIndex(idx) {
        var size = tagGroups.length;
        return ((idx % size) + size) % size;
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getVisibleIndices() {
        if (tagGroups.length === 1) {
            return [null, 0, null];
        }
        if (tagGroups.length === 2) {
            return [0, 1, null];
        }
        return [
            normalizeIndex(activeIndex - 1),
            normalizeIndex(activeIndex),
            normalizeIndex(activeIndex + 1)
        ];
    }

    function renderCards() {
        var visible = getVisibleIndices();
        for (var i = 0; i < cardButtons.length; i++) {
            var btn = cardButtons[i];
            var groupIndex = visible[i];

            if (groupIndex === null || typeof groupIndex === 'undefined') {
                btn.classList.add('is-hidden');
                btn.setAttribute('disabled', 'disabled');
                btn.textContent = '';
                btn.removeAttribute('data-index');
                continue;
            }

            var group = tagGroups[groupIndex];
            btn.classList.remove('is-hidden');
            btn.removeAttribute('disabled');
            btn.setAttribute('data-index', String(groupIndex));
            btn.textContent = group.tag || group.slug || 'Untitled';
            if (groupIndex === activeIndex) {
                btn.classList.add('is-active');
            } else {
                btn.classList.remove('is-active');
            }
        }
    }

    function renderTagIndex() {
        var html = '';
        for (var i = 0; i < tagGroups.length; i++) {
            var group = tagGroups[i];
            html += '<li class="blog-tag-index-item">' +
                '<button class="blog-tag-index-btn' + (i === activeIndex ? ' is-active' : '') + '" type="button" data-index="' + i + '">' +
                escapeHtml(group.tag || group.slug || 'Untitled') +
                '</button>' +
                '</li>';
        }
        indexList.innerHTML = html;
    }

    function renderDetail() {
        var group = tagGroups[activeIndex] || {};
        var entries = Array.isArray(group.entries) ? group.entries : [];
        var html = '<h2 class="blog-detail-title">' + escapeHtml(group.tag || group.slug || 'Untitled') + '</h2>';

        if (entries.length === 0) {
            html += '<p class="blog-empty">暂无条目。</p>';
            detailPanel.innerHTML = html;
            return;
        }

        html += '<ul class="blog-entry-list">';
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i] || {};
            html += '<li class="blog-entry-item">' +
                '<a class="blog-entry-link" href="' + escapeHtml(entry.url || '#') + '">' + escapeHtml(entry.title || 'Untitled') + '</a>';
            if (entry.description) {
                html += '<p class="blog-entry-desc">' + escapeHtml(entry.description) + '</p>';
            }
            html += '</li>';
        }
        html += '</ul>';
        detailPanel.innerHTML = html;
    }

    function renderAll() {
        renderCards();
        renderTagIndex();
        renderDetail();
    }

    function setActive(nextIndex) {
        activeIndex = normalizeIndex(nextIndex);
        renderAll();
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', function () {
            setActive(activeIndex - 1);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            setActive(activeIndex + 1);
        });
    }

    if (stage) {
        stage.addEventListener('click', function (event) {
            var target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }
            var idx = target.getAttribute('data-index');
            if (idx === null) {
                return;
            }
            setActive(parseInt(idx, 10));
        });
    }

    if (indexList) {
        indexList.addEventListener('click', function (event) {
            var target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }
            if (!target.classList.contains('blog-tag-index-btn')) {
                return;
            }
            var idx = target.getAttribute('data-index');
            if (idx === null) {
                return;
            }
            setActive(parseInt(idx, 10));
        });
    }

    renderAll();
})();
</script>


</section>

</div>