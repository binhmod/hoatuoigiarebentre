// Đường dẫn trực tiếp từ GitHub Pages - Đã được tối ưu chống cache
const DATA_URL = "https://binhmod.github.io/hoatuoigiarebentre/products.json";

let SHOP_CONFIG = {};
let products = [];
let categoriesList = []; 
let currentCategory = 'all';
let searchQuery = '';

// --- TIỆN ÍCH: Chuyển chuỗi tiếng Việt thành slug URL ---
function toSlug(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

// Tạo hash URL dạng: hoa-chuc-mung-khai-truong-1
function buildDetailHash(product) {
    return toSlug(product.type) + '-' + product.id;
}

// Parse hash để lấy id sản phẩm
function parseDetailHash(hash) {
    // Hash format: #type-slug-id  (id là phần số cuối)
    const match = hash.replace('#', '').match(/^(.+)-(\d+)$/);
    if (match) return parseInt(match[2]);
    return null;
}

// Kích hoạt hệ thống ngay khi cấu trúc trang HTML đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    fetchDataOnline();
});

// --- TẢI DỮ LIỆU TRỰC TIẾP TỪ GITHUB PAGES (ĐÃ TỐI ƯU CHỐNG CACHE) ---
function fetchDataOnline() {
    const container = document.getElementById('product-list');
    if (container) {
        container.innerHTML = `<p style="text-align:center; width:100%; color:#666; padding: 40px 0; font-family:'Roboto',sans-serif;">🌸 Đang kết nối dữ liệu cửa hàng...</p>`;
    }

    // Thêm tham số thời gian Date.now() để bẻ gãy cache, ép trình duyệt luôn lấy dữ liệu mới nhất
    fetch(`${DATA_URL}?t=${Date.now()}`)
        .then(response => {
            if (!response.ok) throw new Error("Không thể tải dữ liệu từ GitHub Pages");
            return response.json();
        })
        .then(data => {
            SHOP_CONFIG = data.shop_config || {};
            products = data.products || [];
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
        renderCategoriesButtons();
        renderProducts();
    }
}

// --- HIỂN THỊ NÚT DANH MỤC (TỰ ĐỘNG LẤY ẢNH HOA TRONG THƯ MỤC CÓ SẴN) ---
function renderCategoriesButtons() {
    const catContainer = document.getElementById('category-list-container');
    if (!catContainer) return;

    let allCategoriesHTML = ''; 

    categoriesList.forEach(cat => {
        const isActive = cat.name === currentCategory ? 'active' : '';
        
        let iconContent = '';
        if (cat.icon_html && cat.icon_html.trim() !== '') {
            // Trường hợp có mã icon HTML cố định (Ví dụ nút "Tất cả")
            iconContent = cat.icon_html;
        } else {
            // 🔥 LOGIC TỰ ĐỘNG THÔNG MINH: Tìm bông hoa đầu tiên thuộc danh mục này
            const firstProductInCat = products.find(p => p.type === cat.name);
            
            // Nếu có hoa trong danh mục thì lấy ảnh của hoa đó, nếu chưa có thì dùng link mặc định/ảnh cover cũ
            const finalImageSrc = firstProductInCat ? firstProductInCat.image : cat.image;

            iconContent = `<img src="${finalImageSrc}" alt="${cat.displayName}" onerror="this.src='https://placehold.co/150x150?text=🌸'">`;
        }

        allCategoriesHTML += `
            <div class="category-card ${isActive}" id="${cat.id}" onclick="filterByCategory('${cat.name}', '${cat.id}')">
                <div class="category-img-wrapper">
                    ${iconContent}
                </div>
                <span>${cat.displayName}</span>
            </div>
        `;
    });

    catContainer.innerHTML = allCategoriesHTML;
}

// --- HIỂN THỊ LƯỚI SẢN PHẨM RA TRANG CHỦ (ĐÃ TỐI ƯU SIÊU MƯỢT) ---
function renderProducts() {
    const container = document.getElementById('product-list');
    if (!container) return;

    const filtered = products.filter(product => {
        const matchesCategory = (currentCategory === 'all' || product.type === currentCategory);
        const matchesSearch = product.type.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<p style="text-align:center; width:100%; color:#c4c7c5; padding: 40px 0; font-family:'Roboto',sans-serif;">Không tìm thấy mẫu hoa nào phù hợp...</p>`;
        return;
    }

    let allProductsHTML = '';

    filtered.forEach(product => {
        const hash = buildDetailHash(product);
        allProductsHTML += `
            <div class="product-card" onclick="window.location.href='detail.html#${hash}'" style="overflow:hidden; border-radius:16px; cursor:pointer;">
                <div style="position:relative; width:100%; line-height:0;">
                    <img src="${product.image}" alt="${product.type}"
                        onerror="this.src='https://placehold.co/600x400?text=Hoa+Tươi'" loading="lazy"
                        style="width:100%; height:auto; display:block; object-fit:contain;">
                    <div style="position:absolute; bottom:0; left:0; right:0;
                        background:linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.18) 60%, transparent 100%);
                        padding:28px 10px 10px 10px; pointer-events:none;">
                        <span style="color:#fff; font-family:'Montserrat',sans-serif;
                            font-size:0.75rem; font-weight:700; text-transform:uppercase;
                            letter-spacing:0.6px; text-shadow:0 1px 4px rgba(0,0,0,0.5);
                            display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
                            line-height:1.35;">${product.type}</span>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = allProductsHTML;
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
    // Lấy id từ hash URL: detail.html#hoa-chuc-mung-khai-truong-1
    const productId = parseDetailHash(window.location.hash);
    const product = products.find(p => p.id === productId);

    if (!product) {
        document.querySelector('main').innerHTML = `<div style="text-align:center; padding: 50px 20px; font-family:'Roboto',sans-serif;"><p>Mẫu hoa này không tồn tại hoặc đã bị gỡ bỏ.</p><a href="index.html" style="color:#2e7d32; font-weight:bold;">Quay lại trang chủ</a></div>`;
        return;
    }

    const detailImg = document.getElementById('detail-product-img');
    detailImg.src = product.image;
    detailImg.dataset.productId = product.id;
    document.getElementById('detail-product-link').href = product.image;
    const dlBtn = document.getElementById('detail-btn-download');
    if (dlBtn) { dlBtn.href = product.image; dlBtn.download = 'hoa-tuoi-' + product.id + '.jpg'; }
    if (document.getElementById('detail-product-tag')) document.getElementById('detail-product-tag').innerText = product.type;
    document.title = `${product.type} - ${SHOP_CONFIG.shop_name || 'Hoa Tươi Giá Rẻ Bến Tre'}`;

    const orderMessage = `Xin chào shop ${SHOP_CONFIG.shop_name || 'Hoa Tươi Giá Rẻ Bến Tre'}, mình đang xem mẫu "${product.type}" trên website và cần đặt mua giao tận nơi.`;
    const encodedMessage = encodeURIComponent(orderMessage);

    // Messenger: hỗ trợ pre-filled text qua m.me?text=
    if (document.getElementById('detail-btn-messenger')) {
        document.getElementById('detail-btn-messenger').href =
            `https://m.me/${SHOP_CONFIG.messenger_username || 'vungtau.hoatuoi.9'}?text=${encodedMessage}`;
    }

    // Zalo: không hỗ trợ pre-filled → copy tin nhắn vào clipboard, rồi mở Zalo
    const zaloBtn = document.getElementById('detail-btn-zalo');
    if (zaloBtn) {
        zaloBtn.removeAttribute('href');
        zaloBtn.style.cursor = 'pointer';
        zaloBtn.onclick = function(e) {
            e.preventDefault();
            navigator.clipboard.writeText(orderMessage).then(() => {
                const orig = zaloBtn.innerHTML;
                zaloBtn.innerHTML = `<i class="fa-solid fa-check" style="font-size:1.2rem;"></i> Đã sao chép! Mở Zalo dán vào`;
                setTimeout(() => {
                    zaloBtn.innerHTML = orig;
                    window.open('https://zalo.me/${SHOP_CONFIG.zalo_phone || "0333330045"}', '_blank');
                }, 1200);
            }).catch(() => {
                // fallback nếu clipboard bị chặn
                window.open('https://zalo.me/${SHOP_CONFIG.zalo_phone || "0333330045"}', '_blank');
            });
        };
    }

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
