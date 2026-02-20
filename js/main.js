gsap.registerPlugin(ScrollTrigger);

// Start
gsap.set(".card-glass, .card-wide, .section-title, .pill-title", { y: 50, opacity: 0 });

// Scroll Animations
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

// Navbar Scroll
window.addEventListener("scroll", () => {
    const nav = document.querySelector(".nav-content");
    if (window.scrollY > 50) {
        nav.style.background = "rgba(10, 10, 10, 0.9)";
    } else {
        nav.style.background = "rgba(20, 20, 20, 0.8)";
    }
});

// Hero Animation
const tl = gsap.timeline();
tl.from(".hero-text > *", { y: 30, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power2.out", delay: 0.2 })
    .from(".hero-img", { x: 30, opacity: 0, duration: 1, ease: "power2.out" }, "-=0.6");

// Mobile Menu T
const navLinks = document.querySelector(".nav-links");
const hamburgerIcon = document.querySelector(".hamburger i");

function toggleMenu() {
    navLinks.classList.toggle("active");
    if (navLinks.classList.contains("active")) {
        hamburgerIcon.classList.remove("fa-bars");
        hamburgerIcon.classList.add("fa-xmark");
    } else {
        hamburgerIcon.classList.remove("fa-xmark");
        hamburgerIcon.classList.add("fa-bars");
    }
}

function closeMenu() {
    navLinks.classList.remove("active");
    hamburgerIcon.classList.remove("fa-xmark");
    hamburgerIcon.classList.add("fa-bars");
}

document.addEventListener('click', (e) => {
    const navbar = document.querySelector('.navbar-floating');
    if (!navbar.contains(e.target)) closeMenu();
});

// Search control
const searchForm = document.getElementById('searchForm');
if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('searchInput').value;
        if (query) alert("Searching for: " + query);
    });
}

// Activity
document.querySelectorAll('.toggle-gallery-btn').forEach(button => {
    button.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const gallery = document.getElementById(targetId);

        if (gallery.classList.contains('show')) {
            gallery.classList.remove('show');
            this.innerHTML = this.innerHTML.replace('Tutup', 'Lihat');
            this.style.background = 'var(--orange)';
        } 

        else {
            gallery.classList.add('show');
            this.innerHTML = this.innerHTML.replace('Lihat', 'Tutup');
            this.style.background = '#b36b00'; 
        }
        
        if(typeof ScrollTrigger !== 'undefined') {
            setTimeout(() => ScrollTrigger.refresh(), 450);
        }
    });
});

// Starfield
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

// --- LOGIKA LIGHTBOX GALLERY ---
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const closeBtn = document.querySelector(".lightbox-close");

let currentImages = []; // Menyimpan foto-foto di galeri yang sedang dibuka
let currentImageIndex = 0;

// Pasang pendeteksi klik ke SEMUA gambar di dalam gallery
document.querySelectorAll('.gallery-grid img').forEach(img => {
    img.addEventListener('click', function() {
        // Ambil semua gambar dalam grid kegiatan yang sedang diklik (misal: hanya foto-foto IFT)
        const parentGrid = this.closest('.gallery-grid');
        currentImages = Array.from(parentGrid.querySelectorAll('img'));
        currentImageIndex = currentImages.indexOf(this);
        
        // Tampilkan lightbox
        lightbox.style.display = "block";
        lightboxImg.src = currentImages[currentImageIndex].src;
        document.body.style.overflow = "hidden"; // Kunci scroll halaman belakang
    });
});

// Fungsi untuk mengganti gambar (Kiri/Kanan)
function changeImage(direction) {
    currentImageIndex += direction;
    
    // Looping gambar (jika sudah gambar terakhir, balik ke gambar pertama, dan sebaliknya)
    if (currentImageIndex >= currentImages.length) {
        currentImageIndex = 0;
    } else if (currentImageIndex < 0) {
        currentImageIndex = currentImages.length - 1;
    }
    
    lightboxImg.src = currentImages[currentImageIndex].src;
}

// Menutup Lightbox saat tombol X diklik
if (closeBtn) {
    closeBtn.addEventListener("click", function() {
        lightbox.style.display = "none";
        document.body.style.overflow = "auto"; // Aktifkan scroll halaman lagi
    });
}

// Menutup Lightbox jika mengklik area gelap (di luar gambar)
if (lightbox) {
    lightbox.addEventListener("click", function(e) {
        if (e.target === lightbox) {
            lightbox.style.display = "none";
            document.body.style.overflow = "auto";
        }
    });
}

// Tambahan: Navigasi pakai Keyboard (Panah Kiri, Kanan, dan tombol Esc)
document.addEventListener("keydown", function(e) {
    if (lightbox && lightbox.style.display === "block") {
        if (e.key === "ArrowLeft") {
            changeImage(-1);
        } else if (e.key === "ArrowRight") {
            changeImage(1);
        } else if (e.key === "Escape") {
            lightbox.style.display = "none";
            document.body.style.overflow = "auto";
        }
    }
});