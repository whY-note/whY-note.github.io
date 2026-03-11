---
layout: default
title: Projects
permalink: /projects/
---

<div class="projects-page">

<div class="projects-header">
    <a href="/" class="back-btn">← Back</a>
</div>

<section data-aos="fade-up" markdown="1">

# Projects

<div class="project-grid">

{% for project in site.data.projects %}

    <div class="project-card">

    <h3>{{ project.title }}</h3>

    <p>{{ project.description }}</p>

    <div class="project-meta">
        <a class="project-link" href="{{ project.url }}">
            <i class="fa-brands fa-github" aria-hidden="true"></i> Github
        </a>

        <!-- only if project.stars > 0, the number of stars will be shown here -->
        {% if project.stars and project.stars > 0 %}
        <span class="project-stars">
            <i class="fa-solid fa-star" aria-hidden="true"></i>
            {{ project.stars }}
        </span>
        {% endif %}
    </div>

    </div>

{% endfor %}

</div>

</section>

</div>
