---
layout: home
title: Home
---

<section data-aos="fade-up" markdown="1">

# About Me

Hi! I am Haowen Yan, an undergraduate student majoring in Computer Science and Technology at [Sun Yat-Sen University](https://www.sysu.edu.cn/). 
Currently, I am a research intern at [Xspark AI](https://github.com/XsparkAI). I am also privileged to intern at [TEA Lab](https://github.com/TEA-Lab) under the supervision of Prof. [Huazhe Xu](http://hxu.rocks/), where I worked on **teleoperation**. During my undergraduate studies, I was also fortunate to be mentored by Prof. [Gang Chen](https://cse.sysu.edu.cn/teacher/Chengang), working on **optimal control and UAV**.

My research interests mainly include **Embodied AI**, **robotics**, **reinforcement learning** and **optimal control**. 

My long-term research goal is to develop robotic systems capable of operating in complex and hazardous environments, such as fire or earthquake scenarios, to assist in rescue missions and ultimately benefit society and our humanity.

Beyond research, I am also passionate about Chinese calligraphy.

Feel free to reach out if you are interested in collaboration.

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

</section>


<!---------- Publications ------------>
<!-- <section data-aos="fade-up" markdown="1">

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

</section> -->

<!---------- Projects ------------>
<section data-aos="fade-up" markdown="1">

# Projects 

<div class="project-grid">

{% for project in site.data.projects limit:4 %}

    <div class="project-card">

    <h3>{{ project.title }}</h3>

    <p>{{ project.description }}</p>

    <a href="{{ project.url }}">Code</a>

    </div>

{% endfor %}

</div>

<a href="/projects/" class="more-btn">More →</a>

</section>


<!---------- Education ------------>
<section data-aos="fade-up" markdown="1">

# Education

Coming soon ...

</section>


<!---------- Awards ------------>
<section data-aos="fade-up" markdown="1">

# Awards

Coming soon ...

</section>

<!---------- Contact Me ------------>
<section data-aos="fade-up" markdown="1">

# Contact Me

Coming soon ...

</section>


