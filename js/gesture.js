/**
 * 3D 体素蛋糕 + 手势识别系统
 * 握紧拳头 = 蛋糕成型，张开手掌 = 蛋糕爆炸
 */

class VoxelCakeSystem {
    constructor() {
        this.container = document.getElementById('cake-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.voxels = []; // 所有的体素粒子
        this.cakeGroup = null;
        this.isAssembled = false; // 蛋糕是否成型
        this.animationId = null;

        // 蛋糕配置
        this.voxelSize = 0.8;
        this.cakeConfig = {
            base: { radius: 5, height: 3, color: 0xf4a460 }, // 底层
            middle: { radius: 4, height: 2, color: 0xffb6c1 }, // 中层（糖霜）
            top: { radius: 3, height: 2, color: 0xf4a460 }, // 顶层
            candles: [
                { x: 0, z: 0, color: 0xff0000 },
                { x: -1.5, z: -1, color: 0xff6600 },
                { x: 1.5, z: -1, color: 0xff6600 }
            ]
        };

        this.init();
    }

    init() {
        // 创建 Three.js 场景
        this.scene = new THREE.Scene();
        this.scene.background = null; // 透明背景

        // 相机
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 15, 25);
        this.camera.lookAt(0, 0, 0);

        // 渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // 灯光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);

        const backLight = new THREE.DirectionalLight(0xffd700, 0.3);
        backLight.position.set(-10, 10, -10);
        this.scene.add(backLight);

        // 创建体素蛋糕
        this.createVoxelCake();

        // 初始状态：散开
        this.explode(false);

        // 开始渲染循环
        this.animate();

        // 窗口大小调整
        window.addEventListener('resize', () => this.onResize());
    }

    // 创建体素蛋糕结构
    createVoxelCake() {
        const geometry = new THREE.BoxGeometry(this.voxelSize, this.voxelSize, this.voxelSize);

        // 创建底层
        this.createLayer(geometry, this.cakeConfig.base, 0);

        // 创建中层
        this.createLayer(geometry, this.cakeConfig.middle, this.cakeConfig.base.height);

        // 创建顶层
        this.createLayer(geometry, this.cakeConfig.top,
            this.cakeConfig.base.height + this.cakeConfig.middle.height);

        // 创建蜡烛
        this.cakeConfig.candles.forEach(candle => {
            const material = new THREE.MeshLambertMaterial({
                color: candle.color,
                emissive: candle.color,
                emissiveIntensity: 0.3
            });
            const voxel = new THREE.Mesh(geometry, material);

            // 蜡烛位置（在顶层上方）
            const y = (this.cakeConfig.base.height +
                      this.cakeConfig.middle.height +
                      this.cakeConfig.top.height) * this.voxelSize;

            voxel.position.set(
                candle.x * this.voxelSize,
                y + this.voxelSize,
                candle.z * this.voxelSize
            );

            // 保存原始位置（蛋糕成型时的位置）
            voxel.userData = {
                homePos: voxel.position.clone(),
                velocity: new THREE.Vector3(),
                rotationSpeed: new THREE.Vector3(
                    Math.random() * 0.1,
                    Math.random() * 0.1,
                    Math.random() * 0.1
                )
            };

            this.scene.add(voxel);
            this.voxels.push(voxel);
        });
    }

    // 创建蛋糕的一层
    createLayer(geometry, config, yOffset) {
        const material = new THREE.MeshLambertMaterial({ color: config.color });
        const radius = config.radius;

        for (let y = 0; y < config.height; y++) {
            for (let x = -radius; x <= radius; x++) {
                for (let z = -radius; z <= radius; z++) {
                    // 圆形判断
                    if (x * x + z * z <= radius * radius + 0.5) {
                        const voxel = new THREE.Mesh(geometry, material);

                        voxel.position.set(
                            x * this.voxelSize,
                            (yOffset + y) * this.voxelSize,
                            z * this.voxelSize
                        );

                        // 保存原始位置
                        voxel.userData = {
                            homePos: voxel.position.clone(),
                            velocity: new THREE.Vector3(),
                            rotationSpeed: new THREE.Vector3(
                                Math.random() * 0.05,
                                Math.random() * 0.05,
                                Math.random() * 0.05
                            )
                        };

                        this.scene.add(voxel);
                        this.voxels.push(voxel);
                    }
                }
            }
        }
    }

    // 蛋糕爆炸（散开）
    explode(animated = true) {
        this.isAssembled = false;

        this.voxels.forEach((voxel, i) => {
            // 随机散开位置
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + Math.random() * 15;
            const height = (Math.random() - 0.5) * 20;

            const targetX = Math.cos(angle) * radius;
            const targetZ = Math.sin(angle) * radius;
            const targetY = height;

            if (animated) {
                // 使用 GSAP 风格的动画
                this.animateVoxel(voxel, targetX, targetY, targetZ, true);
            } else {
                voxel.position.set(targetX, targetY, targetZ);
                voxel.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
            }
        });
    }

    // 蛋糕聚合（成型）
    assemble() {
        this.isAssembled = true;

        this.voxels.forEach((voxel, i) => {
            const home = voxel.userData.homePos;
            this.animateVoxel(voxel, home.x, home.y, home.z, false);
        });
    }

    // 体素动画
    animateVoxel(voxel, targetX, targetY, targetZ, isExplosion) {
        const startX = voxel.position.x;
        const startY = voxel.position.y;
        const startZ = voxel.position.z;
        const startRotX = voxel.rotation.x;
        const startRotY = voxel.rotation.y;
        const startRotZ = voxel.rotation.z;

        const duration = isExplosion ? 800 : 1000; // 爆炸快一点，聚合慢一点
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // 缓动函数
            const ease = isExplosion
                ? 1 - Math.pow(1 - progress, 3) // easeOutCubic
                : progress < 0.5
                    ? 4 * progress * progress * progress // easeInCubic
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2; // easeInOutCubic

            voxel.position.x = startX + (targetX - startX) * ease;
            voxel.position.y = startY + (targetY - startY) * ease;
            voxel.position.z = startZ + (targetZ - startZ) * ease;

            // 旋转
            if (isExplosion) {
                voxel.rotation.x = startRotX + progress * Math.PI * 2;
                voxel.rotation.y = startRotY + progress * Math.PI * 2;
            } else {
                // 聚合时旋转归零
                voxel.rotation.x = startRotX * (1 - ease);
                voxel.rotation.y = startRotY * (1 - ease);
                voxel.rotation.z = startRotZ * (1 - ease);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    // 漂浮动画（散开状态下的轻微浮动）
    updateFloating() {
        if (this.isAssembled) return;

        const time = Date.now() * 0.001;
        this.voxels.forEach((voxel, i) => {
            const offset = i * 0.5;
            voxel.position.y += Math.sin(time + offset) * 0.02;
            voxel.rotation.x += voxel.userData.rotationSpeed.x;
            voxel.rotation.y += voxel.userData.rotationSpeed.y;
        });
    }

    // 水波纹效果（点击屏幕）
    createRipple(x, y) {
        // 将屏幕坐标转换为世界坐标
        const mouse = new THREE.Vector2(
            (x / window.innerWidth) * 2 - 1,
            -(y / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        // 在散开状态下，点击会产生波纹推开粒子
        if (!this.isAssembled) {
            const intersectPoint = new THREE.Vector3(
                mouse.x * 20,
                mouse.y * 20,
                0
            );

            this.voxels.forEach(voxel => {
                const distance = voxel.position.distanceTo(intersectPoint);
                if (distance < 8) {
                    const force = (8 - distance) / 8;
                    const direction = voxel.position.clone().sub(intersectPoint).normalize();

                    // 推开粒子
                    voxel.position.add(direction.multiplyScalar(force * 3));
                }
            });
        }
    }

    // 渲染循环
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        // 散开状态下的漂浮
        this.updateFloating();

        // 蛋糕成型时的缓慢旋转
        if (this.isAssembled) {
            this.voxels.forEach(voxel => {
                voxel.rotation.y += 0.005;
            });
        }

        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    reset() {
        this.explode(false);
    }

    /**
     * 根据手势旋转设置蛋糕旋转角度
     * @param {number} yaw - 水平旋转角度（度）
     * @param {number} pitch - 垂直倾斜角度（度）
     */
    setRotation(yaw, pitch) {
        // 只在蛋糕成型状态下应用旋转
        if (!this.isAssembled) return;

        // 将角度转换为弧度
        const yawRad = yaw * (Math.PI / 180);
        const pitchRad = pitch * (Math.PI / 180);

        // 限制俯仰角范围，避免蛋糕翻转过头
        const clampedPitch = Math.max(-0.5, Math.min(0.5, pitchRad * 0.5));

        // 平滑插值目标旋转
        this.targetRotationY = yawRad;
        this.targetRotationX = clampedPitch;

        // 如果没有设置过初始值，初始化
        if (this.currentRotationY === undefined) {
            this.currentRotationY = 0;
            this.currentRotationX = 0;
        }

        // 平滑过渡到目标角度
        const smoothFactor = 0.1;
        this.currentRotationY += (this.targetRotationY - this.currentRotationY) * smoothFactor;
        this.currentRotationX += (this.targetRotationX - this.currentRotationX) * smoothFactor;

        // 应用旋转到蛋糕组
        // 计算蛋糕中心点
        const centerY = (this.cakeConfig.base.height +
                        this.cakeConfig.middle.height +
                        this.cakeConfig.top.height) * this.voxelSize / 2;

        this.voxels.forEach(voxel => {
            const homePos = voxel.userData.homePos;

            // 相对于中心点的位置
            const relX = homePos.x;
            const relY = homePos.y - centerY;
            const relZ = homePos.z;

            // 应用 Y 轴旋转（水平转动）
            const cosY = Math.cos(this.currentRotationY);
            const sinY = Math.sin(this.currentRotationY);
            const rotX = relX * cosY - relZ * sinY;
            const rotZ = relX * sinY + relZ * cosY;

            // 应用 X 轴旋转（垂直倾斜）
            const cosX = Math.cos(this.currentRotationX);
            const sinX = Math.sin(this.currentRotationX);
            const finalY = relY * cosX - rotZ * sinX;
            const finalZ = relY * sinX + rotZ * cosX;

            // 更新位置
            voxel.position.x = rotX;
            voxel.position.y = finalY + centerY;
            voxel.position.z = finalZ;

            // 同时更新体素自身的旋转，让它看起来是整体转动
            voxel.rotation.y = -this.currentRotationY;
            voxel.rotation.x = -this.currentRotationX;
        });
    }
}

/**
 * 手势识别控制器
 */
class GestureController {
    constructor() {
        this.video = document.getElementById('camera-video');
        this.canvas = document.getElementById('camera-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.statusText = document.getElementById('gesture-status');
        this.touchHint = document.getElementById('touch-hint');
        this.nextBtn = document.getElementById('btn-next-page');

        this.hands = null;
        this.isInitialized = false;
        this.isModelLoaded = false;
        this.currentGesture = null;
        this.gestureHistory = [];
        this.lastGestureTime = 0;
        this.voxelCake = null;
        this.touchMode = false;
        this.frameInterval = null;
        this.lastFrameTime = 0;
        this.frameDelay = 100; // 10fps，降低帧率减轻 WASM 压力

        // 绑定下一页按钮
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => {
                if (window.showPage) window.showPage('ending');
            });
        }
    }

    async init() {
        // 初始化粒子蛋糕系统
        this.particleCake = new ParticleCakeSystem();

        try {
            await this.initCamera();
        } catch (err) {
            console.log('摄像头初始化失败，切换到触摸模式:', err);
            this.switchToTouchMode();
        }

        // 点击蛋糕切换散开/聚合状态
        const container = document.getElementById('cake-container');
        container.addEventListener('click', () => {
            if (this.particleCake) {
                if (this.particleCake.isExploded()) {
                    this.particleCake.assemble();
                    this.statusText.textContent = this.touchMode ? '蛋糕聚合中...' : '✊ 蛋糕成型';
                } else {
                    this.particleCake.explode();
                    this.statusText.textContent = this.touchMode ? '蛋糕散开中...' : '🖐️ 蛋糕散开';
                }
            }
        });
    }

    async initCamera() {
        try {
            console.log('开始初始化 MediaPipe...');
            this.statusText.textContent = '正在加载手势识别模型...';

            // 创建 Hands 实例
            this.hands = new Hands({
                locateFile: (file) => {
                    console.log('MediaPipe 加载文件:', file);
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            // 设置选项 - 使用完整模型以获取深度信息(z值)
            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1, // 完整模型才能获取准确的z值 (0=轻量无深度, 1=完整, 2=重)
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            // 绑定结果回调
            this.hands.onResults(this.onResults.bind(this));

            // 等待 WASM 初始化完成
            console.log('等待 MediaPipe WASM 初始化...');
            await this.waitForMediaPipeInit();
            console.log('MediaPipe WASM 初始化完成');

            // 请求摄像头权限
            console.log('正在请求摄像头权限...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 320 }, // 降低分辨率减少处理压力
                    height: { ideal: 240 }
                }
            });
            console.log('摄像头权限已获取');

            this.video.srcObject = stream;

            // 等待视频加载完成
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => {
                    console.log('视频元数据加载完成:', this.video.videoWidth, 'x', this.video.videoHeight);
                    resolve();
                };
                this.video.onerror = (e) => {
                    console.error('视频加载错误:', e);
                    reject(e);
                };
            });

            await this.video.play();
            console.log('视频开始播放');

            // 设置画布尺寸
            const videoWidth = this.video.videoWidth || 320;
            const videoHeight = this.video.videoHeight || 240;

            this.canvas.width = videoWidth;
            this.canvas.height = videoHeight;
            this.canvas.style.width = '160px';
            this.canvas.style.height = '120px';

            console.log('画布尺寸:', this.canvas.width, 'x', this.canvas.height);

            this.isInitialized = true;
            this.statusText.textContent = '握拳=成型 张开=散开 | 旋转手=转相机';
            this.touchHint.style.display = 'none';

            // 开始检测循环（使用 setTimeout 降低帧率）
            this.startDetectionLoop();

        } catch (err) {
            console.error('摄像头初始化失败:', err);
            this.statusText.textContent = '摄像头启动失败，切换到触摸模式';
            this.switchToTouchMode();
        }
    }

    /**
     * 等待 MediaPipe WASM 初始化完成
     */
    waitForMediaPipeInit() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5秒超时

            const checkInit = () => {
                attempts++;

                // 检查 hands 实例是否就绪
                if (this.hands && this.hands.send) {
                    console.log('MediaPipe 初始化成功，尝试次数:', attempts);
                    this.isModelLoaded = true;
                    resolve();
                    return;
                }

                if (attempts >= maxAttempts) {
                    reject(new Error('MediaPipe 初始化超时'));
                    return;
                }

                setTimeout(checkInit, 100);
            };

            checkInit();
        });
    }

    /**
     * 启动检测循环（使用 setTimeout 控制帧率）
     */
    startDetectionLoop() {
        const processFrame = async () => {
            if (!this.isInitialized || this.touchMode) return;

            const now = Date.now();
            const elapsed = now - this.lastFrameTime;

            // 控制帧率
            if (elapsed >= this.frameDelay) {
                this.lastFrameTime = now;

                // 确保视频准备就绪且 MediaPipe 已加载
                if (this.video.readyState >= 2 &&
                    this.video.videoWidth > 0 &&
                    this.video.videoHeight > 0 &&
                    this.isModelLoaded &&
                    this.hands) {

                    try {
                        // 同步画布尺寸
                        if (this.canvas.width !== this.video.videoWidth ||
                            this.canvas.height !== this.video.videoHeight) {
                            this.canvas.width = this.video.videoWidth;
                            this.canvas.height = this.video.videoHeight;
                        }

                        // 发送帧到 MediaPipe
                        await this.hands.send({ image: this.video });
                    } catch (err) {
                        console.warn('MediaPipe 处理帧出错:', err.message);
                        // 如果是 WASM 错误，尝试降级到触摸模式
                        if (err.message && err.message.includes('wasm')) {
                            console.error('WASM 错误，切换到触摸模式');
                            this.statusText.textContent = '手势识别出错，切换到触摸模式';
                            this.switchToTouchMode();
                            return;
                        }
                    }
                }
            }

            // 继续下一帧
            this.frameInterval = setTimeout(processFrame, this.frameDelay);
        };

        processFrame();
    }

    /**
     * 停止检测循环
     */
    stopDetectionLoop() {
        if (this.frameInterval) {
            clearTimeout(this.frameInterval);
            this.frameInterval = null;
        }
    }

    switchToTouchMode() {
        // 停止手势检测循环
        this.stopDetectionLoop();

        this.touchMode = true;
        this.statusText.textContent = '点击=散开/聚合 | 拖动旋转 | 双指缩放';
        this.touchHint.style.display = 'block';
        this.touchHint.innerHTML = '<p>单击蛋糕=散开/聚合 | 拖动旋转 | 双指捏合缩放</p>';

        const cameraContainer = document.querySelector('.camera-container');
        if (cameraContainer) cameraContainer.style.display = 'none';

        const container = document.getElementById('cake-container');

        // 触摸控制相机
        let startX = 0;
        let startAngle = 0;
        let startDistance = 0;
        let isDragging = false;
        let initialPinchDist = 0;

        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                // 单指拖动旋转
                isDragging = true;
                startX = e.touches[0].clientX;
                startAngle = this.particleCake ? this.particleCake.cameraAngle : 0;
            } else if (e.touches.length === 2) {
                // 双指缩放
                initialPinchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                startDistance = this.particleCake ? this.particleCake.cameraDistance : 25;
            }
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!this.particleCake) return;

            if (e.touches.length === 1 && isDragging) {
                // 拖动旋转
                const deltaX = e.touches[0].clientX - startX;
                const sensitivity = 0.005;
                this.particleCake.setCameraRotation((startAngle - deltaX * sensitivity) * 180 / Math.PI);
            } else if (e.touches.length === 2) {
                // 双指缩放
                const currentPinchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const scale = initialPinchDist / currentPinchDist;
                const newDistance = Math.max(12, Math.min(50, startDistance * scale));
                this.particleCake.setTargetDistance(newDistance);
            }
        }, { passive: true });

        container.addEventListener('touchend', () => {
            isDragging = false;
        });

        // 鼠标控制（桌面端）
        let mouseDown = false;
        let mouseStartX = 0;
        let mouseStartAngle = 0;

        container.addEventListener('mousedown', (e) => {
            mouseDown = true;
            mouseStartX = e.clientX;
            mouseStartAngle = this.particleCake ? this.particleCake.cameraAngle : 0;
        });

        container.addEventListener('mousemove', (e) => {
            if (!mouseDown || !this.particleCake) return;
            const deltaX = e.clientX - mouseStartX;
            const sensitivity = 0.005;
            this.particleCake.setCameraRotation((mouseStartAngle - deltaX * sensitivity) * 180 / Math.PI);
        });

        container.addEventListener('mouseup', () => {
            mouseDown = false;
        });

        container.addEventListener('mouseleave', () => {
            mouseDown = false;
        });

        // 滚轮缩放
        container.addEventListener('wheel', (e) => {
            if (!this.particleCake) return;
            e.preventDefault();
            const delta = e.deltaY > 0 ? 1.1 : 0.9;
            const newDistance = Math.max(12, Math.min(50, this.particleCake.cameraDistance * delta));
            this.particleCake.setTargetDistance(newDistance);
        }, { passive: false });
    }

    onResults(results) {
        // 确保画布尺寸与视频匹配
        if (this.video.videoWidth && this.video.videoHeight) {
            if (this.canvas.width !== this.video.videoWidth ||
                this.canvas.height !== this.video.videoHeight) {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
            }
        }

        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const handCount = results.multiHandLandmarks?.length || 0;

        if (handCount > 0) {
            // 绘制所有手
            results.multiHandLandmarks.forEach(landmarks => {
                const mirroredLandmarks = landmarks.map(p => ({
                    x: 1 - p.x,
                    y: p.y,
                    z: p.z
                }));
                this.drawHand(mirroredLandmarks);
            });

            // 处理双手手势
            if (handCount >= 2) {
                this.handleTwoHands(results.multiHandLandmarks[0], results.multiHandLandmarks[1]);
            } else {
                // 单手 fallback
                const landmarks = results.multiHandLandmarks[0];
                const gesture = this.detectGesture(landmarks);
                this.handleGesture(gesture, landmarks);
            }

            this.statusText.textContent = `检测到 ${handCount} 只手`;
        } else {
            this.statusText.textContent = '请将手放在摄像头前...';
        }

        this.ctx.restore();
    }

    drawHand(landmarks) {
        // 绘制手部关键点 - 更醒目的样式
        const width = this.canvas.width;
        const height = this.canvas.height;

        // 绘制连接线 - 先画线再画点，让点在线上方
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],           // 拇指
            [0, 5], [5, 6], [6, 7], [7, 8],           // 食指
            [0, 9], [9, 10], [10, 11], [11, 12],      // 中指
            [0, 13], [13, 14], [14, 15], [15, 16],    // 无名指
            [0, 17], [17, 18], [18, 19], [19, 20],    // 小指
            [5, 9], [9, 13], [13, 17]                 // 手掌横线
        ];

        // 绘制连接线 - 绿色粗线
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';

        connections.forEach(([start, end]) => {
            const x1 = landmarks[start].x * width;
            const y1 = landmarks[start].y * height;
            const x2 = landmarks[end].x * width;
            const y2 = landmarks[end].y * height;

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        });

        // 绘制关键点
        landmarks.forEach((point, i) => {
            const x = point.x * width;
            const y = point.y * height;

            // 外圈 - 深色边框
            this.ctx.beginPath();
            this.ctx.arc(x, y, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = '#006600';
            this.ctx.fill();

            // 内圈 - 亮绿色
            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fill();

            // 关节编号 (小字体)
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(String(i), x, y);
        });

        // 标记手腕点(0号)更大更醒目
        const wrist = landmarks[0];
        const wx = wrist.x * width;
        const wy = wrist.y * height;

        this.ctx.beginPath();
        this.ctx.arc(wx, wy, 12, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.fill();
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    detectGesture(landmarks) {
        // 计算手指张开数量
        const fingerTips = [8, 12, 16, 20];  // 食指、中指、无名指、小指尖
        const fingerBases = [5, 9, 13, 17];  // 对应手指根部
        const wrist = landmarks[0];

        let extendedCount = 0;
        const debugInfo = [];

        // 检测四指（食指到小指）
        fingerTips.forEach((tipIdx, i) => {
            const tip = landmarks[tipIdx];
            const base = landmarks[fingerBases[i]];

            // 计算指尖和指根到手腕的距离
            const tipDist = Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
            const baseDist = Math.sqrt(Math.pow(base.x - wrist.x, 2) + Math.pow(base.y - wrist.y, 2));

            const isExtended = tipDist > baseDist * 1.2;
            if (isExtended) extendedCount++;

            debugInfo.push(`手指${i+1}: ${isExtended ? '伸' : '弯'}`);
        });

        // 拇指检测（使用不同的逻辑，因为拇指运动方式不同）
        const thumbTip = landmarks[4];
        const thumbIP = landmarks[3];
        const thumbMCP = landmarks[2];

        // 拇指伸出判断：指尖到IP关节的距离相对于MCP到手腕的距离
        const thumbTipToIP = Math.sqrt(Math.pow(thumbTip.x - thumbIP.x, 2) + Math.pow(thumbTip.y - thumbIP.y, 2));
        const thumbMCPToWrist = Math.sqrt(Math.pow(thumbMCP.x - wrist.x, 2) + Math.pow(thumbMCP.y - wrist.y, 2));

        if (thumbTipToIP > thumbMCPToWrist * 0.3) {
            extendedCount++;
            debugInfo.push('拇指: 伸');
        } else {
            debugInfo.push('拇指: 弯');
        }

        // 根据伸出的手指数量判断手势
        if (extendedCount >= 4) return 'open';  // 张开手掌
        if (extendedCount <= 1) return 'fist';  // 握紧拳头
        return 'unknown';
    }

    handleGesture(gesture, landmarks) {
        // 单手模式：控制蛋糕爆炸/聚合 + 相机旋转 + 握拳时控制相机远近
        if (!this.particleCake) return;

        // 1. 旋转控制 - 手的水平角度控制相机围绕蛋糕旋转（始终生效）
        const rotation = this.calculateHandRotation(landmarks);
        this.particleCake.setCameraRotation(rotation.yaw);

        // 2. 蛋糕爆炸/聚合控制
        // 握拳 = 聚合（成型），张开 = 散开
        if (gesture === 'fist') {
            this.particleCake.assemble();
        } else if (gesture === 'open') {
            this.particleCake.explode();
        }

        // 3. 距离控制 - 仅在握拳时根据手的前后位置控制相机远近
        // MediaPipe z 值在 modelComplexity: 1 时有效
        // 备选方案：使用手的大小（视觉大小）判断远近
        const handDepth = landmarks[0].z;
        const handSize = this.calculateHandSize(landmarks); // 备选方案

        if (gesture === 'fist') {
            // 优先使用 z 值，如果无效则使用手的大小
            let depthValue = handDepth;
            let useZValue = Math.abs(handDepth) > 0.001;

            // 将深度值映射到相机距离
            // z > 0 (往后缩) 或手变小 → 距离变小 (靠近蛋糕)
            // z < 0 (往前伸) 或手变大 → 距离变大 (远离蛋糕)
            const minDist = 15;  // 最靠近蛋糕
            const maxDist = 45;  // 最远离蛋糕

            let targetDist;

            if (useZValue) {
                // 使用 z 值
                const scale = 40;
                targetDist = 25 - depthValue * scale;
            } else {
                // 使用手的大小作为备选
                // 手越大（像素占比高）→ 相机远离
                // 手越小（像素占比低）→ 相机靠近
                const normalizedSize = Math.max(0.1, Math.min(0.6, handSize));
                // 0.1(小/远) → 距离15, 0.6(大/近) → 距离45
                targetDist = minDist + (normalizedSize - 0.1) / 0.5 * (maxDist - minDist);
            }

            // 限制在有效范围内
            targetDist = Math.max(minDist, Math.min(maxDist, targetDist));

            this.particleCake.setTargetDistance(targetDist);

            const distance = Math.round(this.particleCake.cameraDistance);

            // 调试输出
            if (Math.random() < 0.1) {
                console.log(`z: ${handDepth.toFixed(3)}, handSize: ${handSize.toFixed(3)}, useZ: ${useZValue}, target: ${targetDist.toFixed(1)}`);
            }

            // 显示状态
            if (useZValue) {
                if (handDepth > 0.05) {
                    this.statusText.textContent = `✊ 手往后缩 → 相机靠近 | 距离: ${distance}`;
                } else if (handDepth < -0.05) {
                    this.statusText.textContent = `✊ 手往前伸 → 相机远离 | 距离: ${distance}`;
                } else {
                    this.statusText.textContent = `✊ 蛋糕成型 | 距离: ${distance}`;
                }
            } else {
                if (handSize < 0.2) {
                    this.statusText.textContent = `✊ 手变小(远) → 相机靠近 | 距离: ${distance}`;
                } else if (handSize > 0.4) {
                    this.statusText.textContent = `✊ 手变大(近) → 相机远离 | 距离: ${distance}`;
                } else {
                    this.statusText.textContent = `✊ 蛋糕成型 | 距离: ${distance}`;
                }
            }
        }
        else if (gesture === 'open') {
            this.statusText.textContent = `🖐️ 蛋糕散开 | 旋转: ${Math.round(rotation.yaw)}°`;
        }
    }

    /**
     * 处理双手手势
     * 双手同时控制：蛋糕聚合/散开 + 相机旋转 + 握拳时相机距离
     */
    handleTwoHands(leftHand, rightHand) {
        if (!this.particleCake) return;

        const leftGesture = this.detectGesture(leftHand);
        const rightGesture = this.detectGesture(rightHand);

        // 1. 相机旋转 - 使用双手的平均角度
        const leftRotation = this.calculateHandRotation(leftHand);
        const rightRotation = this.calculateHandRotation(rightHand);
        const avgRotation = (leftRotation.yaw + rightRotation.yaw) / 2;
        this.particleCake.setCameraRotation(avgRotation);

        // 2. 蛋糕聚合/散开控制
        // 双手握拳 = 聚合，双手张开 = 散开，混合 = 保持当前状态
        if (leftGesture === 'fist' && rightGesture === 'fist') {
            this.particleCake.assemble();
        } else if (leftGesture === 'open' && rightGesture === 'open') {
            this.particleCake.explode();
        }

        // 3. 相机距离控制 - 仅在握拳时根据手的前后位置
        const leftDepth = leftHand[0].z;
        const rightDepth = rightHand[0].z;
        const avgDepth = (leftDepth + rightDepth) / 2;

        const bothFist = leftGesture === 'fist' && rightGesture === 'fist';
        const oneFist = leftGesture === 'fist' || rightGesture === 'fist';

        if (bothFist) {
            // 双手握拳：手往后缩(z>0) → 相机靠近蛋糕(距离减小)
            //          手往前伸(z<0) → 相机远离蛋糕(距离增大)
            const minDist = 15;
            const maxDist = 45;

            // 使用手的大小作为备选
            const leftSize = this.calculateHandSize(leftHand);
            const rightSize = this.calculateHandSize(rightHand);
            const avgSize = (leftSize + rightSize) / 2;

            let targetDist;
            const useZValue = Math.abs(avgDepth) > 0.001;

            if (useZValue) {
                const scale = 40;
                targetDist = 25 - avgDepth * scale;
            } else {
                const normalizedSize = Math.max(0.1, Math.min(0.6, avgSize));
                targetDist = minDist + (normalizedSize - 0.1) / 0.5 * (maxDist - minDist);
            }

            targetDist = Math.max(minDist, Math.min(maxDist, targetDist));
            this.particleCake.setTargetDistance(targetDist);

            const distance = Math.round(this.particleCake.cameraDistance);
            if (useZValue) {
                if (avgDepth > 0.05) {
                    this.statusText.textContent = `✊✊ 手往后缩 → 相机靠近 | 距离: ${distance}`;
                } else if (avgDepth < -0.05) {
                    this.statusText.textContent = `✊✊ 手往前伸 → 相机远离 | 距离: ${distance}`;
                } else {
                    this.statusText.textContent = `✊✊ 蛋糕成型 | 距离: ${distance}`;
                }
            } else {
                if (avgSize < 0.2) {
                    this.statusText.textContent = `✊✊ 手变小 → 相机靠近 | 距离: ${distance}`;
                } else if (avgSize > 0.4) {
                    this.statusText.textContent = `✊✊ 手变大 → 相机远离 | 距离: ${distance}`;
                } else {
                    this.statusText.textContent = `✊✊ 蛋糕成型 | 距离: ${distance}`;
                }
            }
        }
        else if (leftGesture === 'open' && rightGesture === 'open') {
            this.statusText.textContent = `🖐️🖐️ 蛋糕散开 | 旋转: ${Math.round(avgRotation)}°`;
        }
        else {
            this.statusText.textContent = `↻ 旋转: ${Math.round(avgRotation)}°`;
        }
    }

    /**
     * 计算双手之间的距离
     */
    calculateHandDistance(hand1, hand2) {
        const wrist1 = hand1[0];
        const wrist2 = hand2[0];
        return Math.sqrt(
            Math.pow(wrist1.x - wrist2.x, 2) +
            Math.pow(wrist1.y - wrist2.y, 2)
        );
    }

    /**
     * 计算手的视觉大小（作为深度的备选指标）
     * 返回 0-1 之间的值，越大表示手在画面中越大（越靠近摄像头）
     */
    calculateHandSize(landmarks) {
        // 计算手的边界框
        let minX = 1, maxX = 0, minY = 1, maxY = 0;

        for (const point of landmarks) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }

        // 计算手的面积占画面的比例
        const width = maxX - minX;
        const height = maxY - minY;
        const area = width * height;

        // 归一化到 0-1 范围（典型值在 0.05 到 0.5 之间）
        return Math.min(1, area * 4); // 乘以4因为通常手只占画面的一部分
    }

    /**
     * 计算手掌/拳头的旋转角度
     * 返回 { yaw, pitch, roll } 角度（度）
     */
    calculateHandRotation(landmarks) {
        const wrist = landmarks[0];
        const middleFingerMCP = landmarks[9];  // 中指根部
        const indexFingerMCP = landmarks[5];   // 食指根部
        const pinkyMCP = landmarks[17];        // 小指根部

        // 计算手掌朝向（yaw - 水平旋转）
        // 使用食指根部和小指根部的连线
        const handVectorX = pinkyMCP.x - indexFingerMCP.x;
        const handVectorY = pinkyMCP.y - indexFingerMCP.y;
        const yaw = Math.atan2(handVectorY, handVectorX) * (180 / Math.PI);

        // 计算俯仰角（pitch - 上下倾斜）
        // 使用手腕到中指的垂直距离
        const verticalVector = middleFingerMCP.y - wrist.y;
        const horizontalDist = Math.sqrt(
            Math.pow(middleFingerMCP.x - wrist.x, 2) +
            Math.pow(middleFingerMCP.z - wrist.z, 2)
        );
        const pitch = Math.atan2(verticalVector, horizontalDist) * (180 / Math.PI);

        return {
            yaw: yaw - 90,  // 调整基准角度，让手心向下时为0度
            pitch: -pitch   // 反转使方向正确
        };
    }

    detectFrame() {
        // 已废弃，使用 startDetectionLoop 替代
        console.warn('detectFrame 已废弃，使用 startDetectionLoop');
    }

    reset() {
        this.currentGesture = null;
        this.gestureHistory = [];

        // 停止当前检测循环
        this.stopDetectionLoop();

        // 重置粒子蛋糕
        if (this.particleCake) {
            this.particleCake.setCameraRotation(0);
            this.particleCake.setTargetDistance(25);
            this.particleCake.setCameraHeight(5);
        }

        // 如果不在触摸模式，重新启动检测
        if (!this.touchMode && this.isInitialized) {
            this.startDetectionLoop();
        }

        this.statusText.textContent = this.touchMode ? '点击=散开/聚合 | 拖动旋转' : '握拳=成型 张开=散开 | 旋转手=转相机';
    }

    /**
     * 诊断 MediaPipe 状态
     * 在浏览器控制台运行: window.GestureController.diagnose()
     */
    diagnose() {
        const status = {
            hands: {
                initialized: !!this.hands,
                modelLoaded: this.isModelLoaded,
                sendFunction: this.hands && typeof this.hands.send === 'function'
            },
            video: {
                initialized: !!this.video,
                readyState: this.video ? this.video.readyState : 'N/A',
                width: this.video ? this.video.videoWidth : 'N/A',
                height: this.video ? this.video.videoHeight : 'N/A',
                playing: this.video ? !this.video.paused : false
            },
            canvas: {
                initialized: !!this.canvas,
                width: this.canvas ? this.canvas.width : 'N/A',
                height: this.canvas ? this.canvas.height : 'N/A'
            },
            controller: {
                isInitialized: this.isInitialized,
                touchMode: this.touchMode,
                currentGesture: this.currentGesture
            },
            particleCake: {
                initialized: !!this.particleCake,
                cameraAngle: this.particleCake ? this.particleCake.cameraAngle : 'N/A',
                cameraDistance: this.particleCake ? this.particleCake.cameraDistance : 'N/A'
            }
        };

        console.log('=== GestureController 诊断报告 ===');
        console.table(status);

        // 输出问题和建议
        const issues = [];
        if (!this.hands) issues.push('❌ MediaPipe Hands 未初始化');
        if (!this.isModelLoaded) issues.push('❌ WASM 模型未加载完成');
        if (!this.video || this.video.readyState < 2) issues.push('❌ 视频未就绪');
        if (this.video && this.video.videoWidth === 0) issues.push('❌ 视频尺寸为0');
        if (!this.isInitialized) issues.push('❌ 控制器未初始化');

        if (issues.length === 0) {
            console.log('✅ 所有组件状态正常');
        } else {
            console.log('发现的问题:');
            issues.forEach(issue => console.log(issue));
        }

        return status;
    }
}

// 烟花效果（结尾页）
const Fireworks = {
    container: null,
    start() {
        this.container = document.getElementById('fireworks');
        if (!this.container) return;

        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.createFirework(), i * 800);
        }
        setInterval(() => this.createFirework(), 2000);
    },
    createFirework() {
        const x = Math.random() * 80 + 10;
        const y = Math.random() * 40 + 10;
        const colors = ['#f77f7f', '#c8e28a', '#fcea92', '#ffb6c1'];

        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            const angle = (i / 12) * Math.PI * 2;
            const distance = Math.random() * 50 + 30;

            particle.style.cssText = `
                position: absolute;
                left: ${x}%;
                top: ${y}%;
                width: 4px;
                height: 4px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 50%;
                --tx: ${Math.cos(angle) * distance}px;
                --ty: ${Math.sin(angle) * distance}px;
                animation: fireworkParticle 1s ease-out forwards;
            `;

            this.container.appendChild(particle);
            setTimeout(() => particle.remove(), 1000);
        }
    }
};

// 添加 CSS 动画
const style = document.createElement('style');
style.textContent = `
    @keyframes fireworkParticle {
        0% { transform: translate(0, 0) scale(1); opacity: 1; }
        100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
    }
`;
document.head.appendChild(style);

// 导出
window.GestureController = new GestureController();
window.Fireworks = Fireworks;

// 页面加载完成后输出诊断信息
window.addEventListener('load', () => {
    console.log('%c🎂 Feile生日祝福网站', 'font-size: 20px; color: #ff69b4; font-weight: bold;');
    console.log('%c手势识别诊断工具已加载', 'font-size: 14px; color: #c8e28a;');
    console.log('运行 window.GestureController.diagnose() 查看详细状态');
});
