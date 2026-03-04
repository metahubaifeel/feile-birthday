/**
 * Cover Flow 轮播组件 - Apple 风格（自动播放 + 闭环循环版）
 * 中间清晰大图，两侧模糊小图
 */

class CoverFlowCarousel {
    constructor(container, images) {
        this.container = container;
        this.images = images;
        this.track = container.querySelector('.coverflow-track');
        this.items = [];
        this.currentIndex = 0;
        this.isDragging = false;
        this.startX = 0;
        this.translateX = 0;
        this.itemWidth = 280; // 与CSS一致
        this.autoPlayInterval = 2500; // 2.5秒自动切换
        this.autoPlayTimer = null;
        this.isAutoPlaying = true;

        this.init();
    }

    init() {
        // 创建轮播项 - 为了实现闭环，需要在首尾各克隆一份
        const allImages = [...this.images, ...this.images, ...this.images]; // 三份实现无缝循环

        allImages.forEach((src, index) => {
            const item = document.createElement('div');
            item.className = 'coverflow-item';
            item.innerHTML = `<img src="${src}" alt="photo ${(index % this.images.length) + 1}" loading="lazy">`;
            this.track.appendChild(item);
            this.items.push(item);
        });

        // 初始位置设置到中间那份的第一张
        this.currentIndex = this.images.length;
        this.translateX = this.currentIndex * this.itemWidth;

        // 绑定事件
        this.bindEvents();

        // 初始渲染
        this.update();

        // 开始自动播放
        this.startAutoPlay();

        console.log('✅ Cover Flow 初始化完成，共', this.images.length, '张图片，自动播放开启');
    }

    /**
     * 更新所有项目的位置和样式
     */
    update() {
        const containerWidth = this.container.offsetWidth;
        const centerOffset = containerWidth / 2;

        this.items.forEach((item, index) => {
            // 计算与中心的距离
            const itemCenter = index * this.itemWidth + this.itemWidth / 2;
            const diff = itemCenter - (this.translateX + centerOffset);
            const distance = Math.abs(diff);

            // 计算实际显示距离（处理循环）
            const totalWidth = this.items.length * this.itemWidth;
            const loopDistance = Math.min(distance, totalWidth - distance);

            // 如果距离太远（超过一屏），隐藏该项
            if (loopDistance > containerWidth) {
                item.style.opacity = 0;
                item.style.pointerEvents = 'none';
                return;
            }

            // Apple Cover Flow 参数
            const maxDistance = 350;
            const actualDistance = Math.min(loopDistance, maxDistance);

            // 缩放：中间1.3x（更大），越远越小
            const scale = 1.3 - (actualDistance / maxDistance) * 0.5; // 1.3 -> 0.8

            // 模糊：中间清晰，越远越模糊
            const blur = (actualDistance / maxDistance) * 6;

            // 透明度：中间1.0，越远越透明
            const opacity = 1 - (actualDistance / maxDistance) * 0.6;

            // 3D 旋转
            const rotateY = diff > 0 ? -25 : 25;

            // Z-index
            const zIndex = Math.floor(100 - actualDistance);

            // 应用样式
            item.style.transform = `
                translateX(${index * this.itemWidth - this.translateX}px)
                scale(${Math.max(0.8, scale)})
                rotateY(${Math.abs(diff) < 10 ? 0 : rotateY}deg)
            `;
            item.style.filter = `blur(${Math.min(6, blur)}px)`;
            item.style.opacity = Math.max(0.4, opacity);
            item.style.zIndex = zIndex;
            item.style.pointerEvents = 'auto';
        });
    }

    /**
     * 绑定触摸/鼠标事件
     */
    bindEvents() {
        // 触摸事件
        this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
        this.container.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
        this.container.addEventListener('touchend', this.onTouchEnd.bind(this));

        // 鼠标事件 - 绑定到容器而不是window
        this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.container.addEventListener('mouseup', this.onMouseUp.bind(this));

        // 鼠标离开容器时也要停止拖动
        this.container.addEventListener('mouseleave', () => {
            if (this.isDragging) {
                this.onMouseUp();
            }
            this.startAutoPlay();
        });

        // 鼠标悬停时暂停自动播放
        this.container.addEventListener('mouseenter', () => this.stopAutoPlay());

        // 防止拖拽时选中文本
        this.container.addEventListener('selectstart', (e) => e.preventDefault());
        this.container.addEventListener('dragstart', (e) => e.preventDefault());
    }

    onTouchStart(e) {
        this.isDragging = true;
        this.startX = e.touches[0].clientX;
        this.stopAutoPlay();
    }

    onTouchMove(e) {
        if (!this.isDragging) return;

        const x = e.touches[0].clientX;
        const delta = this.startX - x;
        this.translateX += delta;
        this.startX = x;

        // 检查循环边界
        this.checkLoop();

        requestAnimationFrame(() => this.update());
    }

    onTouchEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        // 吸附到最近的项
        this.snapToNearest();

        // 恢复自动播放
        setTimeout(() => this.startAutoPlay(), 1000);
    }

    onMouseDown(e) {
        e.preventDefault();
        this.isDragging = true;
        this.hasDragged = false;
        this.startX = e.clientX;
        this.container.style.cursor = 'grabbing';
        this.stopAutoPlay();
    }

    onMouseMove(e) {
        if (!this.isDragging) return;

        const x = e.clientX;
        const delta = this.startX - x;

        // 只有当移动超过5px才认为是拖动
        if (Math.abs(delta) > 5) {
            this.hasDragged = true;
        }

        this.translateX += delta;
        this.startX = x;

        this.checkLoop();
        requestAnimationFrame(() => this.update());
    }

    onMouseUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.container.style.cursor = 'grab';

        this.snapToNearest();
        setTimeout(() => this.startAutoPlay(), 1000);
    }

    /**
     * 检查并处理循环边界
     */
    checkLoop() {
        const totalWidth = this.items.length * this.itemWidth;
        const oneSetWidth = this.images.length * this.itemWidth;

        // 如果滑动到最左边（第一组），跳到中间组
        if (this.translateX < oneSetWidth * 0.5) {
            this.translateX += oneSetWidth;
        }

        // 如果滑动到最右边（第三组），跳到中间组
        if (this.translateX > oneSetWidth * 2.5) {
            this.translateX -= oneSetWidth;
        }
    }

    /**
     * 吸附到最近的项
     */
    snapToNearest() {
        const targetIndex = Math.round(this.translateX / this.itemWidth);
        this.currentIndex = targetIndex;
        const targetX = this.currentIndex * this.itemWidth;

        this.animateTo(targetX, 400, t => 1 - Math.pow(1 - t, 3));
    }

    /**
     * 动画到目标位置
     */
    animateTo(targetX, duration, easing) {
        const startX = this.translateX;
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easing(progress);

            this.translateX = startX + (targetX - startX) * eased;

            this.update();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 动画结束后再检查循环边界
                this.checkLoop();
                this.update();
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * 开始自动播放
     */
    startAutoPlay() {
        if (this.autoPlayTimer) return;

        this.isAutoPlaying = true;
        this.autoPlayTimer = setInterval(() => {
            this.next();
        }, this.autoPlayInterval);
    }

    /**
     * 停止自动播放
     */
    stopAutoPlay() {
        if (this.autoPlayTimer) {
            clearInterval(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
        this.isAutoPlaying = false;
    }

    /**
     * 下一张
     */
    next() {
        this.currentIndex++;
        let targetX = this.currentIndex * this.itemWidth;

        // 检查是否需要循环（在动画前静默调整）
        const oneSetWidth = this.images.length * this.itemWidth;
        if (this.currentIndex >= this.images.length * 2.5) {
            // 先静默跳回中间组，用户无感知
            const newIndex = this.currentIndex - this.images.length;
            const newTranslateX = newIndex * this.itemWidth;
            // 只有当距离目标很远时才静默跳转
            if (Math.abs(this.translateX - newTranslateX) > oneSetWidth * 0.5) {
                this.currentIndex = newIndex;
                this.translateX = newTranslateX;
                targetX = this.currentIndex * this.itemWidth;
            }
        }

        this.animateTo(targetX, 600, t => {
            // 弹性缓动
            const c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        });
    }

    /**
     * 上一张
     */
    prev() {
        this.currentIndex--;
        let targetX = this.currentIndex * this.itemWidth;

        const oneSetWidth = this.images.length * this.itemWidth;
        if (this.currentIndex < this.images.length * 0.5) {
            // 先静默跳回中间组
            const newIndex = this.currentIndex + this.images.length;
            const newTranslateX = newIndex * this.itemWidth;
            if (Math.abs(this.translateX - newTranslateX) > oneSetWidth * 0.5) {
                this.currentIndex = newIndex;
                this.translateX = newTranslateX;
                targetX = this.currentIndex * this.itemWidth;
            }
        }

        this.animateTo(targetX, 600, t => 1 - Math.pow(1 - t, 3));
    }
}

/**
 * 初始化 Cover Flow
 */
function initCoverFlow(photos) {
    const container = document.getElementById('coverflow');
    if (!container) {
        console.error('❌ Cover Flow 容器未找到');
        return;
    }

    window.coverflow = new CoverFlowCarousel(container, photos);
}

// 导出到全局
window.CoverFlowCarousel = CoverFlowCarousel;
window.initCoverFlow = initCoverFlow;
