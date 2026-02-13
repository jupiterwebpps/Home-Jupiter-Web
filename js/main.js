gsap.registerPlugin(ScrollTrigger);

// 1. Navbar Scroll Effect
window.addEventListener("scroll", () => {
    const nav = document.querySelector(".nav-content");
    if (window.scrollY > 50) {
        nav.style.background = "rgba(10, 10, 10, 0.9)";
    } else {
        nav.style.background = "rgba(20, 20, 20, 0.8)";
    }
});

// 2. Initial Setup (Hide elements for animation)
gsap.set(".card-glass, .card-wide, .section-title, .pill-title", { y: 50, opacity: 0 });

// 3. Hero Animation
const tl = gsap.timeline();
tl.from(".hero-text > *", { y: 30, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power2.out", delay: 0.2 })
    .from(".hero-img", { x: 30, opacity: 0, duration: 1, ease: "power2.out" }, "-=0.6");

// 4. Scroll Reveal Animations
gsap.utils.toArray(".section, .newsletter").forEach(section => {
    const elements = section.querySelectorAll(".card-glass, .card-wide, .section-title, .pill-title, .newsletter-content > *");
    if (elements.length > 0) {
        gsap.to(elements, {
            scrollTrigger: {
                trigger: section,
                start: "top 85%",
                toggleActions: "play none none reverse"
            },
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.1,
            ease: "power2.out",
            overwrite: "auto"
        });
    }
});

// 5. Starfield Background
const canvas = document.getElementById("starfield");
if (canvas) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const geometry = new THREE.BufferGeometry();
    const count = 1000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) { positions[i] = (Math.random() - 0.5) * 200; }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ size: 0.2, color: 0xffffff });
    const stars = new THREE.Points(geometry, material);
    scene.add(stars);

    function animate() {
        requestAnimationFrame(animate);
        stars.rotation.y += 0.0003;
        renderer.render(scene, camera);
    }
    animate();
    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}