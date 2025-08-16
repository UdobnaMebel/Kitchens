document.addEventListener('DOMContentLoaded', () => {

    //======================================================================
    // 1. ЛОГИКА ДЛЯ МОБИЛЬНОГО МЕНЮ (ГАМБУРГЕР)
    //======================================================================
    function handleMobileMenu() {
        const menuIcon = document.querySelector('.menu-icon');
        const nav = document.querySelector('.main-nav');
        if (!menuIcon || !nav) return;
        menuIcon.addEventListener('click', () => nav.classList.toggle('active'));
    }

    //======================================================================
    // 2. ЛОГИКА ДЛЯ ОТПРАВКИ ФОРМЫ В TELEGRAM (ВЕРСИЯ ДЛЯ НЕСКОЛЬКИХ ПОЛУЧАТЕЛЕЙ)
    //======================================================================
    function handleTelegramForm() {
        const form = document.getElementById('telegram-form');
        if (!form) return;

        const formMessage = document.getElementById('form-message');
        const botToken = '7558283184:AAHm6tbplgZNX0MgYi3ZC_aSF-dzc9jJndg';
        
        // ↓↓↓ ВСТАВЬТЕ СЮДА ID ВСЕХ НУЖНЫХ ЛЮДЕЙ ↓↓↓
        const chatIds = ['1584547360', '317482035', 'ДРУГОЙ_ID_2']; 
        // ↑↑↑ ID нужно указывать в кавычках через запятую ↑↑↑

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = this.elements.name.value;
            const phone = this.elements.phone.value;
            const text = `🔔 Новая заявка с сайта!\n\n👤 Имя: ${name}\n📞 Телефон: ${phone}`;
            
            if (formMessage) {
                formMessage.textContent = 'Отправка...';
                formMessage.style.color = '#333';
            }

            // Создаем массив "обещаний" для отправки всем пользователям
            const sendPromises = chatIds.map(chatId => {
                return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: text })
                }).then(response => response.json());
            });

            // Promise.all ждет, пока все сообщения будут отправлены
            Promise.all(sendPromises)
                .then(results => {
                    // Проверяем, что хотя бы одна отправка была успешной
                    if (results.some(res => res.ok)) {
                        if(formMessage) {
                            formMessage.textContent = 'Спасибо! Ваша заявка отправлена.';
                            formMessage.style.color = 'green';
                        }
                        form.reset();
                    } else {
                        throw new Error('Ни одно сообщение не было отправлено успешно.');
                    }
                })
                .catch(error => {
                    if(formMessage) {
                        formMessage.textContent = 'Ошибка отправки. Попробуйте позже.';
                        formMessage.style.color = 'red';
                    }
                    console.error('Ошибка:', error);
                })
                .finally(() => {
                    setTimeout(() => { if (formMessage) formMessage.textContent = ''; }, 4000);
                });
        });
    }

    //======================================================================
    // 3. ЛОГИКА ДЛЯ ДИНАМИЧЕСКОГО КАТАЛОГА И КАРТОЧЕК ТОВАРОВ
    //======================================================================
    
    async function fetchText(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.text();
        } catch (e) {
            console.error(`Не удалось загрузить файл: ${url}`, e);
            return null;
        }
    }

    async function generateCatalog() {
        const grid = document.getElementById('catalog-grid');
        if (!grid) return;

        if (typeof catalogFolders === 'undefined' || catalogFolders.length === 0) {
            grid.innerHTML = '<p>В каталоге пока нет товаров.</p>';
            return;
        }
        grid.innerHTML = '';
        for (const folderId of catalogFolders) {
            const name = await fetchText(`catalog/${folderId}/name.txt`);
            const imageSrc = `catalog/${folderId}/image.jpg`;
            if (name) {
                grid.innerHTML += `
                    <a href="product.html?id=${folderId}" class="catalog-item">
                        <img src="${imageSrc}" alt="${name.trim()}">
                        <h3>${name.trim()}</h3>
                    </a>`;
            }
        }
    }

    async function populateProductPage() {
        if (!document.body.classList.contains('page-product')) return;

        const params = new URLSearchParams(window.location.search);
        const productId = params.get('id');
        const productContent = document.getElementById('product-content');
        const notFoundMessage = document.getElementById('product-not-found');

        if (!productId || typeof catalogFolders === 'undefined' || !catalogFolders.includes(productId)) {
            if (notFoundMessage) notFoundMessage.style.display = 'block';
            return;
        }

        const [name, description, facade, body, furniture, tabletop, price] = await Promise.all([
            fetchText(`catalog/${productId}/name.txt`),
            fetchText(`catalog/${productId}/description.txt`),
            fetchText(`catalog/${productId}/facade-material.txt`),
            fetchText(`catalog/${productId}/body-material.txt`),
            fetchText(`catalog/${productId}/furniture.txt`),
            fetchText(`catalog/${productId}/tabletop.txt`),
            fetchText(`catalog/${productId}/price.txt`)
        ]);

        if (!name) {
            if (notFoundMessage) notFoundMessage.style.display = 'block';
            return;
        }

        document.title = `${name.trim()} - Udobna`;
        document.getElementById('product-header-title').textContent = name.trim();
        document.getElementById('product-name').textContent = name.trim();
        if (description) document.getElementById('product-description').textContent = description.trim();
        if (price) document.getElementById('product-price-info').textContent = price.trim();
        const specsContainer = document.getElementById('product-specs');
        specsContainer.innerHTML = '';
        const characteristics = [
            { label: 'Материал фасадов', value: facade }, { label: 'Материал корпуса', value: body },
            { label: 'Фурнитура', value: furniture }, { label: 'Столешница', value: tabletop }
        ];
        characteristics.forEach(spec => {
            if (spec.value && spec.value.trim() !== '') {
                specsContainer.innerHTML += `<div class="spec-item"><span>${spec.label}</span><strong>${spec.value.trim()}</strong></div>`;
            }
        });

        const imagePaths = await findProductImages(productId);
        const track = document.querySelector('.carousel-track');
        const nav = document.querySelector('.carousel-nav');

        if (imagePaths.length > 0) {
            imagePaths.forEach((path, index) => {
                track.innerHTML += `<div class="carousel-slide"><img src="${path}" alt="${name.trim()} - фото ${index + 1}"></div>`;
                if (imagePaths.length > 1) {
                    nav.innerHTML += `<button class="carousel-dot"></button>`;
                }
            });

            if (imagePaths.length > 0) { // Запускаем карусель даже для одного фото, чтобы установить высоту
                setupCarousel();
            }
        } else {
            track.innerHTML = `<div class="carousel-slide"><img src="placeholder.jpg" alt="Изображение отсутствует"></div>`;
        }

        if (productContent) productContent.style.display = 'block';
    }

    async function findProductImages(productId) {
        const images = [];
        let i = 1;
        let probing = true;
        while(probing) {
            const imageName = (i === 1) ? 'image.jpg' : `image${i}.jpg`;
            const path = `catalog/${productId}/${imageName}`;
            try {
                const response = await fetch(path, { method: 'HEAD' });
                if (response.ok) {
                    images.push(path);
                    i++;
                } else {
                    probing = false;
                }
            } catch (error) {
                probing = false;
            }
        }
        return images;
    }

    // ✔ НОВАЯ ФУНКЦИЯ ДЛЯ ДИНАМИЧЕСКОЙ ВЫСОТЫ
    function adjustContainerHeight(imageElement) {
        const container = document.querySelector('.carousel-container');
        if (!container || !imageElement) return;

        // Функция для установки высоты
        const setHeight = () => {
            container.style.height = imageElement.offsetHeight + 'px';
        };

        // Если изображение уже загружено, устанавливаем высоту сразу
        if (imageElement.complete) {
            setHeight();
        } else {
            // Если нет, ждем события 'load'
            imageElement.addEventListener('load', setHeight, { once: true });
        }
    }

    function setupCarousel() {
        const track = document.querySelector('.carousel-track');
        const slides = Array.from(track.children);
        const nextButton = document.querySelector('.carousel-button--right');
        const prevButton = document.querySelector('.carousel-button--left');
        const dotsNav = document.querySelector('.carousel-nav');
        const dots = Array.from(dotsNav.children);

        // Устанавливаем начальную высоту по первой картинке
        adjustContainerHeight(slides[0].querySelector('img'));

        if (slides.length <= 1) return;

        nextButton.style.display = 'flex';
        prevButton.style.display = 'flex';
        
        let currentIndex = 0;

        const updateCarousel = (targetIndex) => {
            track.style.transform = 'translateX(' + (-100 * targetIndex) + '%)';
            dots[currentIndex].classList.remove('current-slide');
            dots[targetIndex].classList.add('current-slide');
            currentIndex = targetIndex;

            // ✔ ИЗМЕНЕНИЕ: Вызываем функцию для подстройки высоты при каждом переключении
            const targetImage = slides[targetIndex].querySelector('img');
            adjustContainerHeight(targetImage);
        }
        
        dots[0].classList.add('current-slide');

        nextButton.addEventListener('click', () => {
            let nextIndex = currentIndex + 1 >= slides.length ? 0 : currentIndex + 1;
            updateCarousel(nextIndex);
        });

        prevButton.addEventListener('click', () => {
            let prevIndex = currentIndex - 1 < 0 ? slides.length - 1 : currentIndex - 1;
            updateCarousel(prevIndex);
        });

        dotsNav.addEventListener('click', e => {
            const targetDot = e.target.closest('button.carousel-dot');
            if (!targetDot) return;
            const targetIndex = dots.findIndex(dot => dot === targetDot);
            updateCarousel(targetIndex);
        });
    }

    //======================================================================
    // 4. ИНИЦИАЛИЗАЦИЯ (ЗАПУСК ВСЕХ ФУНКЦИЙ)
    //======================================================================
    handleMobileMenu();
    handleTelegramForm();
    generateCatalog();
    populateProductPage();
});
