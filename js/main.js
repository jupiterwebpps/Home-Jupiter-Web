gsap.registerPlugin(ScrollTrigger);

// intro Hero
gsap.from(".hero-content > *", {
    opacity: 1,
    y: 40,
    duration: 1,
    stagger: 0.15,
    ease: "power3.out"
});

// Animasi seksi saat scroll
gsap.utils.toArray(".section").forEach(section => {
    gsap.from(section.querySelectorAll(".card, h2, p, form"), {
        scrollTrigger: {
            trigger: section,
            start: "top 80%"
        },
        opacity: 1,
        y: 40,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out"
    });
});


/* STARFIELD */
const canvas = document.getElementById("starfield");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const stars = new THREE.BufferGeometry();
const starCount = 2000;
const positions = [];

for (let i = 0; i < starCount; i++) {
    positions.push((Math.random() - 0.5) * 1000);
    positions.push((Math.random() - 0.5) * 1000);
    positions.push((Math.random() - 0.5) * 1000);
}

stars.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1 });
const starField = new THREE.Points(stars, starMaterial);
scene.add(starField);

function animate() {
    requestAnimationFrame(animate);
    starField.rotation.y += 0.0004;
    renderer.render(scene, camera);
}

animate();
