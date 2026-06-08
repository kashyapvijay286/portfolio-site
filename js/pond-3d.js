let scene, camera, renderer, water, controls;
let lotuses = []; // Array to store flowers & their HTML labels
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Magical Colors (Pink, Blue, Purple, Gold, White)
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

    // WATER SHADER 
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

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xa78bfa, 1.0); 
    dirLight.position.set( - 1, 1, 1 ).normalize();
    scene.add(dirLight);

    // CONTROLS
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.maxPolarAngle = Math.PI / 2 - 0.05; 
    controls.minDistance = 20;
    controls.maxDistance = 500;

    window.addEventListener( 'resize', onWindowResize );
    window.addEventListener('pointerdown', onPointerDown);

    loadFirebasePostsAndModels();
    animate();
}

function loadFirebasePostsAndModels() {
    const gltfLoader = new THREE.GLTFLoader();
    const modelPath = 'assets/3d/lotus.glb'; // Yahan apne phool ka path lagayein
    const nameTagsContainer = document.getElementById('name-tags-container');
    
    db.collection("kalamkaari").get().then(snapshot => {
        let posts = [];
        snapshot.forEach(doc => {
            if (doc.data().status !== "pending") {
                posts.push({ id: doc.id, ...doc.data() });
            }
        });

        gltfLoader.load(modelPath, function(gltf) {
            const baseModel = gltf.scene;
            
            posts.forEach((post, index) => {
                let lotusClone = baseModel.clone();
                
                // Scale (Zaroorat hisaab se adjust karein)
                lotusClone.scale.set(1, 1, 1); 
                
                let randX = (Math.random() - 0.5) * 800; 
                let randZ = (Math.random() - 0.5) * 800; 
                lotusClone.position.set(randX, 0, randZ); 

                // 🎨 RANDOM MAGICAL COLOR LOGIC
                let randomHex = magicalColors[Math.floor(Math.random() * magicalColors.length)];
                lotusClone.traverse((child) => {
                    if (child.isMesh) {
                        // Clone the material so colors don't mix across all flowers
                        child.material = child.material.clone();
                        // Tint the flower with the random magical color
                        child.material.color.setHex(randomHex);
                        // Make it slightly glowing
                        child.material.emissive.setHex(randomHex);
                        child.material.emissiveIntensity = 0.2;
                    }
                });

                // 🏷️ CREATE FLOATING HTML NAME TAG
                const nameLabel = document.createElement('div');
                nameLabel.className = 'floating-name';
                nameLabel.textContent = post.author || "Anjaan"; // Default name
                nameTagsContainer.appendChild(nameLabel);
                
                // Store data
                lotusClone.userData = { isLotus: true, postData: post, labelHTML: nameLabel };
                
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

// 🎯 RAYCASTING (Clicking)
function onPointerDown( event ) {
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

// 📜 ANTIQUE LETTER HTML MODAL
window.openLotusModal = function(post) {
    // Adding line breaks so it looks like poetry
    let formattedText = post.content.replace(/\n/g, '<br>');
    document.getElementById("modal-content").innerHTML = `"${formattedText}"`;
    document.getElementById("modal-author").innerText = `- ${post.author} -`;
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
        // Bobbing animation
        lotus.position.y = Math.sin(time * 2 + index) * 2;
        lotus.rotation.y += 0.005;

        // 🏷️ UPDATE HTML NAME TAG POSITIONS (3D to 2D Screen Projection)
        if (lotus.userData.labelHTML) {
            let vector = new THREE.Vector3();
            // Get exact 3D position of lotus
            vector.setFromMatrixPosition(lotus.matrixWorld);
            // Move the tag slightly ABOVE the lotus (Adjust this number if label is too high/low)
            vector.y += 15; 
            
            // Project 3D coordinate to 2D Camera Screen
            vector.project(camera);

            let x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            let y = -(vector.y * 0.5 - 0.5) * window.innerHeight;

            const label = lotus.userData.labelHTML;
            // Hide label if it goes behind the camera
            if (vector.z > 1 || vector.z < -1) {
                label.style.display = 'none';
            } else {
                label.style.display = 'block';
                label.style.left = `${x}px`;
                label.style.top = `${y}px`;
                
                // Scale text based on distance (Door jayega toh text chhota ho jayega)
                let scaleSize = Math.max(0.3, 1 - vector.z);
                label.style.transform = `translate(-50%, -100%) scale(${scaleSize})`;
                // Opacity fade in distance
                label.style.opacity = scaleSize < 0.4 ? '0' : '1';
            }
        }
    });

    controls.update();
    renderer.render( scene, camera );
}

init3DPond();
