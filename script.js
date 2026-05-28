// Đường dẫn trực tiếp từ GitHub Pages - Không lo lỗi CORS, không cần proxy trung gian
const DATA_URL = "https://binhmod.github.io/hoatuoigiarebentre/products.json";

let SHOP_CONFIG = {};
let products = [];
let categoriesList = []; 
let currentCategory = 'all';
let searchQuery = '';

// Kích hoạt hệ thống ngay khi cấu trúc trang HTML đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    fetchDataOnline();
});

// --- TẢI DỮ LIỆU TRỰC TIẾP TỪ GITHUB PAGES ---
function fetchDataOnline() {
    const container = document.getElementById('product-list');
    if (container) {
        container.innerHTML = `<p style="text-align:center; width:100%; color:#666; padding: 40px 0; font-family:'Roboto',sans-serif;">🌸 Đang kết nối dữ liệu cửa hàng...</p>`;
    }

    fetch(DATA_URL)
        .then(response => {
            if (!response.ok) throw new Error("Không thể tải dữ liệu từ GitHub Pages");
            return response.json();
        })
        .then(data => {
            SHOP_CONFIG = data.shop_config || {};
            products = data.products || [];
            // Lấy trực tiếp danh mục từ mảng riêng biệt trong file JSON
            categoriesList = data.categories || []; 

            // Đồng bộ dữ liệu lên toàn bộ thành phần giao diện trang web
            syncShopInterface();
        })
        .catch(error => {
            console.error("Lỗi lấy dữ liệu từ GitHub:", error);
            if (container) {
                container.innerHTML = `<p style="text-align:center; width:100%; color:#ff6f61; padding: 40px 0; font-family:'Roboto',sans-serif;">❌ Lỗi đồng bộ máy chủ trực tuyến. Vui lòng làm mới trang!</p>`;
            }
        });
}

// --- ĐỒNG BỘ THÔNG TIN LÊN KHUNG GIAO DIỆN ---
function syncShopInterface() {
    // 1. Đồng bộ tên Shop lên tiêu đề chính Header
    const headerTitle = document.querySelector('.header-logo h2');
    if (headerTitle && SHOP_CONFIG.shop_name) {
        headerTitle.innerHTML = `🌸 ${SHOP_CONFIG.shop_name}`;
    }

    // 2. Định dạng số điện thoại hiển thị đẹp mắt (0333330045 -> 0333 330 045)
    if (SHOP_CONFIG.phone) {
        const formattedPhone = SHOP_CONFIG.phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
        document.querySelectorAll('.shop-phone-display').forEach(el => el.innerText = formattedPhone);
    }

    // Đồng bộ các thông tin chân trang bổ sung nếu tồn tại
    if (document.getElementById('shop-gmail-display') && SHOP_CONFIG.gmail) document.getElementById('shop-gmail-display').innerText = SHOP_CONFIG.gmail;
    if (document.getElementById('shop-address-display') && SHOP_CONFIG.address) document.getElementById('shop-address-display').innerText = SHOP_CONFIG.address;
    if (document.getElementById('shop-hours-display') && SHOP_CONFIG.open_hours) document.getElementById('shop-hours-display').innerText = SHOP_CONFIG.open_hours;

    // 3. Cập nhật đường dẫn cho Cụm 3 Icon Nổi góc phải dưới màn hình
    if (document.getElementById('floating-zalo')) {
        document.getElementById('floating-zalo').href = `https://zalo.me/${SHOP_CONFIG.zalo_phone || '0333330045'}`;
        
        const zaloIconWrapper = document.getElementById('floating-zalo');
        if (zaloIconWrapper && !zaloIconWrapper.querySelector('img')) {
            zaloIconWrapper.innerHTML = `<img src="images/zalo.svg" alt="Zalo" style="width: 100%; height: 100%; object-fit: contain; display: block;">`;
        }
        
        document.getElementById('floating-facebook').href = `https://facebook.com/${SHOP_CONFIG.facebook_username}`;
        document.getElementById('floating-messenger').href = `https://m.me/${SHOP_CONFIG.messenger_username}`;
    }

    // 4. Kiểm tra môi trường render bằng phần tử đại diện của trang chi tiết
    if (document.getElementById('detail-product-img')) {
        initDetailPage();
    } else {
        if (document.getElementById('back-to-top-btn')) {
            window.addEventListener('scroll', handleWindowScroll);
        }
        // Đã bỏ hàm extractCategoriesFromProducts cũ ở đây để tối ưu tốc độ load
        renderCategoriesButtons();
        renderProducts();
    }
}

// --- HIỂN THỊ NÚT DANH MỤC ĐƯỢC TÁCH RIÊNG TỪ JSON ---
function renderCategoriesButtons() {
    const catContainer = document.getElementById('category-list-container');
    if (!catContainer) return;
    catContainer.innerHTML = '';

    categoriesList.forEach(cat => {
        const isActive = cat.name === currentCategory ? 'active' : '';
        
        // Kiểm tra xem danh mục dùng mã HTML icon (như nút Tất cả) hay dùng file ảnh nghệ thuật
        let iconContent = '';
        if (cat.icon_html && cat.icon_html.trim() !== '') {
            iconContent = cat.icon_html;
        } else {
            iconContent = `<img src="${cat.image}" alt="${cat.displayName}" onerror="this.src='https://placehold.co/150x150?text=🌸'">`;
        }

        const cardHTML = `
            <div class="category-card ${isActive}" id="${cat.id}" onclick="filterByCategory('${cat.name}', '${cat.id}')">
                <div class="category-img-wrapper">
                    ${iconContent}
                </div>
                <span>${cat.displayName}</span>
            </div>
        `;
        catContainer.innerHTML += cardHTML;
    });
}

// --- HIỂN THỊ LƯỚI SẢN PHẨM RA TRANG CHỦ ---
function renderProducts() {
    const container = document.getElementById('product-list');
    if (!container) return;
    container.innerHTML = ''; 

    const filtered = products.filter(product => {
        const matchesCategory = (currentCategory === 'all' || product.type === currentCategory);
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              product.type.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<p style="text-align:center; width:100%; color:#c4c7c5; padding: 40px 0; font-family:'Roboto',sans-serif;">Không tìm thấy mẫu hoa nào phù hợp...</p>`;
        return;
    }

    filtered.forEach(product => {
        const cardHTML = `
            <div class="product-card" onclick="window.location.href='detail.html?id=${product.id}'">
                <div class="product-img-box">
                    <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://placehold.co/400x400?text=Hoa+Tươi'">
                </div>
                <div class="product-info">
                    <div class="product-meta">
                        <span class="product-type-tag font-sans">${product.type}</span>
                        <h4 class="product-name" style="font-family:'Roboto', sans-serif; font-style:normal; font-weight:500;">${product.name}</h4>
                        <div class="product-price font-sans">${product.price}</div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

// --- XỬ LÝ LỌC KHI CLICK CHỌN DANH MỤC ---
function filterByCategory(categoryName, elementId) {
    currentCategory = categoryName;
    const titleMap = {
        'all': 'Tất cả bộ sưu tập', 
        'Chúc Mừng': 'Hoa Chúc Mừng Sang Trọng', 
        'Chia Buồn': 'Hoa Chia Buồn Sâu Sắc',
        'Sinh Nhật': 'Bó Hoa Sinh Nhật Tươi Đẹp', 
        'Giỏ Hoa Quả': 'Giỏ Hoa Quả Cao Cấp', 
        'Lan Hồ Điệp': 'Chậu Lan Hồ Điệp Nghệ Thuật'
    };
    
    if (document.getElementById('current-category-title')) {
        document.getElementById('current-category-title').innerText = titleMap[categoryName] || categoryName;
    }
    
    document.querySelectorAll('.category-card').forEach(card => card.classList.remove('active'));
    const targetCard = document.getElementById(elementId);
    if (targetCard) targetCard.classList.add('active');
    
    renderProducts();
}

// --- XỬ LÝ THANH TÌM KIẾM ---
function handleSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchQuery = searchInput.value.trim();
        renderProducts();
    }
}

// --- NẠP DỮ LIỆU CHO TRANG CHI TIẾT SẢN PHẨM (DETAIL.HTML) ---
function initDetailPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));
    const product = products.find(p => p.id === productId);

    if (!product) {
        document.querySelector('main').innerHTML = `<div style="text-align:center; padding: 50px 20px; font-family:'Roboto',sans-serif;"><p>Mẫu hoa này không tồn tại hoặc đã bị gỡ bỏ.</p><a href="index.html" style="color:#2e7d32; font-weight:bold;">Quay lại trang chủ</a></div>`;
        return;
    }

    if (document.getElementById('detail-product-img')) document.getElementById('detail-product-img').src = product.image;
    if (document.getElementById('detail-product-tag')) document.getElementById('detail-product-tag').innerText = product.type;
    if (document.getElementById('detail-product-name')) document.getElementById('detail-product-name').innerText = product.name;
    if (document.getElementById('detail-product-price')) document.getElementById('detail-product-price').innerText = product.price;
    document.title = `${product.name} - ${SHOP_CONFIG.shop_name || 'Hoa Tươi Giá Rẻ Bến Tre'}`;

    const encodedMessage = encodeURIComponent(`Xin chào shop ${SHOP_CONFIG.shop_name || 'Hoa Tươi Giá Rẻ Bến Tre'}, mình đang xem mẫu hoa "${product.name}" giá ${product.price} trên website và cần đặt mua giao tận nơi.`);
    
    // Cấu hình liên kết hành động gửi kèm tin nhắn text mẫu
    if (document.getElementById('detail-btn-zalo')) document.getElementById('detail-btn-zalo').href = `https://zalo.me/${SHOP_CONFIG.zalo_phone || '0333330045'}?text=${encodedMessage}`;
    if (document.getElementById('detail-btn-messenger')) document.getElementById('detail-btn-messenger').href = `https://m.me/${SHOP_CONFIG.messenger_username}`;
    if (document.getElementById('detail-btn-call')) document.getElementById('detail-btn-call').href = `tel:${SHOP_CONFIG.phone}`;
}

// --- NÚT CUỘN LÊN ĐẦU TRANG (BACK TO TOP) ---
function handleWindowScroll() {
    const bttBtn = document.getElementById('back-to-top-btn');
    if (!bttBtn) return;
    if (window.scrollY > 300) { 
        bttBtn.classList.add('show'); 
    } else { 
        bttBtn.classList.remove('show'); 
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
