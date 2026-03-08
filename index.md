---
layout: default
title: home
---

# Welcome

v0.1

This is my homepage.

## Publications

{% for publication in site.data.pubications %}

<div class="publication">

<img src="{{ publication.image }}" class="publication-img">

<div class="publication-text">

<h3>{{ publication.title }}</h3>

<p>{{ publication.authors }}</p>

<p>{{ publication.venue }}</p>

<a href="{{ publication.pdf }}">PDF</a>

</div>

</div>

{% endfor %}

## Projects

<div class="project-grid">

{% for project in site.data.projects %}

    <div class="project-card">

    <h3>{{ project.title }}</h3>

    <p>{{ project.description }}</p>

    <a href="{{ project.url }}">Code</a>

    </div>

{% endfor %}

</div>