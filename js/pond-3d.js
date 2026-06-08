let scene, camera, renderer, water, controls;
let lotuses = []; 
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let lastTapTime = 0; 

const magicalColors = [0xffb6c1, 0x87cefa, 0xdda0dd, 0xffd700, 0xffffff, 0xff69b4];

function init3DPond() {
    const container = document.getElementById( 'webgl-container' );

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x022c22);
    
    camera = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 1, 20000 );
    camera.position.set( 0, 50, 150 ); 

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.toneMapping = THREE.ACESFilmicToneMapping; 
    container.appendChild( renderer.domElement );

    const waterGeometry = new THREE.PlaneGeometry( 10000, 10000 );
    water = new THREE.Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load( 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg', function ( texture ) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            } ),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x047857,
            distortionScale: 3.7,
            fog: scene.fog !== undefined
        }
    );
    water.rotation.x = - Math.PI / 2; 
    scene.add( water );

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Thodi dim light taaki chamak achhi dikhe
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xa78bfa, 0.8); 
    dirLight.position.set( - 1, 1, 1 ).normalize();
    scene.add(dirLight);

    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.maxPolarAngle = Math.PI / 2 - 0.05; 
    controls.minDistance = 20;
    controls.maxDistance = 500;

    window.addEventListener( 'resize', onWindowResize );
    window.addEventListener('pointerdown', handlePointerDown);

    loadFirebasePostsAndModels();
    animate();
}

function handlePointerDown(event) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    if (tapLength < 400 && tapLength > 0) {
        triggerRaycast(event);
        event.preventDefault(); 
    }
    lastTapTime = currentTime;
}

function loadFirebasePostsAndModels() {
    const gltfLoader = new THREE.GLTFLoader();
    const modelPath = 'assets/3d/lotus.glb'; 
    const nameTagsContainer = document.getElementById('name-tags-container');
    
    db.collection("kalamkaari").get().then(snapshot => {
        let posts = [];
        snapshot.forEach(doc => {
            if (doc.data().status !== "pending") {
                posts.push({ id: doc.id, ...doc.data() });
            }
        });

        posts.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        gltfLoader.load(modelPath, function(gltf) {
            const baseModel = gltf.scene;
            
            let isMobile = window.innerWidth < 768;
            let spreadX = isMobile ? 300 : 800;  
            let spreadZ = isMobile ? 1200 : 800; 
            
            posts.forEach((post, index) => {
                let lotusClone = baseModel.clone();
                lotusClone.scale.set(1.5, 1.5, 1.5); 
                
                let randX = (Math.random() - 0.5) * spreadX; 
                let randZ = (Math.random() - 0.5) * spreadZ; 
                lotusClone.position.set(randX, 0, randZ); 

                let randomHex = magicalColors[Math.floor(Math.random() * magicalColors.length)];
                let isTop3 = (index < 3);

                let pulseLight = null;
                let coreOrb = null;

                // 1. Phool ka color normal rakhenge (poora nahi chamkayenge)
                lotusClone.traverse((child) => {
                    if (child.isMesh) {
                        child.material = child.material.clone();
                        child.material.color.setHex(randomHex);
                        child.material.emissive.setHex(randomHex);
                        child.material.emissiveIntensity = 0.05; // Bahut halka sa base color
                    }
                });

                // 2. Sirf Top 3 phoolon ke ANDAR jugnu (glowing core) lagayenge
                if(isTop3) {
                    // A. The Glowing Orb (Dil)
                    const orbGeo = new THREE.SphereGeometry(1, 16, 16); // 1 = Size of orb
                    const orbMat = new THREE.MeshBasicMaterial({ color: randomHex }); // Basic mat khud chamakta hai
                    coreOrb = new THREE.Mesh(orbGeo, orbMat);
                    coreOrb.position.set(0, 3, 0); // Phool ke theek center mein (zaroorat pade to 3 ko change karna)
                    lotusClone.add(coreOrb);

                    // B. The Real Light (Jo pankhudiyon par padegi)
                    pulseLight = new THREE.PointLight(randomHex, 0, 40); // Color, Intensity, Distance
                    pulseLight.position.set(0, 3, 0);
                    lotusClone.add(pulseLight);
                }

                const nameLabel = document.createElement('div');
                nameLabel.className = 'floating-name';
                nameLabel.innerHTML = isTop3 ? `✨ ${post.author}` : post.author;
                if(isTop3) nameLabel.style.color = "#fde047"; 

                nameTagsContainer.appendChild(nameLabel);
                
                // Save data for animation
                lotusClone.userData = { 
                    isLotus: true, 
                    postData: post, 
                    labelHTML: nameLabel,
                    isGlowing: isTop3,
                    coreOrb: coreOrb,
                    pulseLight: pulseLight
                };
                
                scene.add(lotusClone);
                lotuses.push(lotusClone); 
            });

            document.getElementById('loading-screen').style.opacity = '0';
            setTimeout(() => { document.getElementById('loading-screen').style.display = 'none'; }, 500);

        }, undefined, function (error) {
            console.error('Error loading 3D Model: ', error);
        });
        
    }).catch(err => console.log(err));
}

function triggerRaycast( event ) {
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    raycaster.setFromCamera( pointer, camera );
    
    const intersects = raycaster.intersectObjects( scene.children, true );
    if ( intersects.length > 0 ) {
        let object = intersects[0].object;
        while(object) {
            if(object.userData && object.userData.isLotus) {
                openLotusModal(object.userData.postData);
                break;
            }
            object = object.parent;
        }
    }
}

// 🔮 GLASSMORPHISM MODAL
window.openLotusModal = function(post) {
    let formattedText = post.content.replace(/\n/g, '<br>');
    document.getElementById("modal-content").innerHTML = `"${formattedText}"`;
    document.getElementById("modal-author").innerHTML = `Written by<br><b>${post.author}</b>`;
    document.getElementById("reading-modal").classList.add("active");
};

window.closeLotusModal = function() {
    document.getElementById("reading-modal").classList.remove("active");
};

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    requestAnimationFrame( animate );
    render();
}

function render() {
    water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
    const time = performance.now() * 0.001;
    
    lotuses.forEach((lotus, index) => {
        // Halka sa tairne ka effect
        lotus.position.y = Math.sin(time * 2 + index) * 2;
        lotus.rotation.y += 0.005;

        // ✨ MAGICAL CORE ANIMATION (Andar se chamak)
        if (lotus.userData.isGlowing) {
            let pulseWave = Math.pow(Math.sin(time * 3 + index), 8); // 0 se 1 ke beech pulse
            
            // 1. Andar ke Jugnu (Orb) ka size chhota-bada karna
            if(lotus.userData.coreOrb) {
                let scale = 1 + (pulseWave * 0.8);
                lotus.userData.coreOrb.scale.set(scale, scale, scale);
            }
            
            // 2. Asli light ko tez-dheema karna (Taki pankhudiyan aur paani chamke)
            if(lotus.userData.pulseLight) {
                lotus.userData.pulseLight.intensity = 0.5 + (pulseWave * 3.5);
            }

            // Tag bhi chamkega
            if(lotus.userData.labelHTML) {
                lotus.userData.labelHTML.style.textShadow = `0 0 ${10 + (pulseWave * 15)}px rgba(253, 224, 71, ${0.5 + pulseWave})`;
            }
        }

        // Names position update
        if (lotus.userData.labelHTML) {
            let vector = new THREE.Vector3();
            vector.setFromMatrixPosition(lotus.matrixWorld);
            vector.y += 8; 
            vector.project(camera);

            let x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            let y = -(vector.y * 0.5 - 0.5) * window.innerHeight;

            const label = lotus.userData.labelHTML;
            if (vector.z > 1 || vector.z < -1) {
                label.style.display = 'none';
            } else {
                label.style.display = 'block';
                label.style.left = `${x}px`;
                label.style.top = `${y}px`;
                
                let scaleSize = Math.max(0.3, 1 - vector.z);
                label.style.transform = `translate(-50%, -100%) scale(${scaleSize})`;
                label.style.opacity = scaleSize < 0.4 ? '0' : '1';
            }
        }
    });

    controls.update();
    renderer.render( scene, camera );
}

init3DPond();