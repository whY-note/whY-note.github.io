---
layout: home
title: Home
description: Homepage of Haowen Yan, including biography, research interests, selected projects, and contact information.
keywords: Haowen Yan, haowen yan, 严浩文, Yan Haowen, yan haowen, yanhaowen, haowenyan, Yhw, yhw, whY, whY-note, Sun Yat-Sen University, SYSU
image: /assets/images/og-home.png
seo_type: profile
---

<section data-aos="fade-up" markdown="1">

# About Me

Hi! I am Haowen Yan, an undergraduate student majoring in Computer Science and Technology at [Sun Yat-Sen University](https://www.sysu.edu.cn/). 
Currently, I am a research intern at [Xspark AI](https://github.com/XsparkAI). I am also privileged to intern at [TEA Lab](https://github.com/TEA-Lab) under the supervision of Prof. [Huazhe Xu](http://hxu.rocks/), where I worked on **teleoperation**. During my undergraduate studies, I was also fortunate to be mentored by Prof. [Gang Chen](https://cse.sysu.edu.cn/teacher/Chengang), working on **optimal control and UAV**.

## Research Interests

My research interests mainly include **Embodied AI**, **robotics**, **reinforcement learning** and **optimal control**. 

My long-term research goal is to develop robotic systems capable of operating in complex and hazardous environments, such as fire or earthquake scenarios, to assist in rescue missions and ultimately benefit society and our humanity.

Feel free to reach out if you are interested in collaboration.

## Beyond Research

Besides research, I am also passionate about:
- ***Chinese calligraphy***: I enjoy the process of practicing Chinese calligraphy, which allows me to slow down, find inner calm, and relax.
- ***Listening to music***: I am a fan of [Leslie Cheung](https://en.wikipedia.org/wiki/Leslie_Cheung), a famous singer and actor in Hong Kong.
- ***Art and design***: I deeply enjoy the process of creating art, and I designed my personal logo myself.

</section>

<section data-aos="fade-up" markdown="1">

# News

v1.3: 
left sidebar and right content can scroll independently, and all content can appear while scroll.

v1.4: 
add image bar at the top of right content

v1.5:
image bar can scroll and add a python file to read all images into the image_bar.yml

v1.6:
layout is center now, and projects finished!

v1.7:
add theme (especially in background)

v1.8:
change the style of project-card background.

v1.9:
footer finish!

v1.10:
SEO finish!

v1.11:
education finish!

v1.12:
Honors finish!

v1.13:
add quote

v1.14:
add theme toggle and all font color, bg color, btn color have been changed

v1.15:
change the style of button

</section>


<!---------- Publications ------------>
<section data-aos="fade-up" markdown="1">

# Publications

{% for publication in site.data.publications %}

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

<a href="/publications/" class="more-btn">
    More 
    <span class="arrow">
        
        &raquo;
    </span>
</a>

</section>


<!---------- Projects ------------>
<section data-aos="fade-up" markdown="1">

# Projects 

<div class="project-grid">

<!-- Only show the top 4 -->
{% for project in site.data.projects limit:4 %}

    <div class="project-card">

    <h3>{{ project.title }}</h3>

    <p>{{ project.description }}</p>

    <div class="project-meta">
        <a class="project-link" href="{{ project.url }}">
            <i class="fa-brands fa-github" aria-hidden="true"></i> 
            Code
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

<a href="/projects/" class="more-btn">
    More 
    <span class="arrow">
        
        &raquo;
    </span>
</a>

</section>


<!---------- Honors & Academic Awards ------------>
<section data-aos="fade-up" markdown="1">

# Honors & Academic Awards

<div class="honors-grid">
{% for honor in site.data.honors %}
    <div class="honor-card">
        <img
            src="{{ honor.image }}"
            alt="{{ honor.title }}"
            class="honor-image"
        >
        <h3 class="honor-title">{{ honor.title }}</h3>
    </div>
{% endfor %}
</div>

</section>

<!---------- Education ------------>
<section data-aos="fade-up" markdown="1">

# Education

<div class="education-list">
{% for education in site.data.education %}
    <div class="education-card">
        <div class="education-logo-wrapper">
            <img
                src="{{ education.logo }}"
                alt="{{ education.school }} logo"
                class="education-logo"
            >
        </div>

        <div class="education-content">
            <a href="{{education.website}}">
                <i class="education-school">{{ education.school }}</i>
            </a>
            <p class="education-college"> {{education.degree}} from {{ education.college }}</p>
            <p class="education-period">{{ education.period }}</p>
        </div>
    </div>
{% endfor %}
</div>

</section>

<!---------- Contact Me ------------>
<section data-aos="fade-up" markdown="1">

# Contact Me

Coming soon ...

</section>


