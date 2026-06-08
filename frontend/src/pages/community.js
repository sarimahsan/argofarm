// ====== ArgoFarm — Community & Marketplace Page ======

import { getState } from '../state.js';
import { showToast, formatDate } from '../utils.js';
import { renderMobileHeader } from '../components/sidebar.js';
import {
  apiGetCommunityPosts,
  apiCreateCommunityPost,
  apiLikePost,
  apiGetComments,
  apiCreateComment,
  apiGetMarketplace,
  apiCreateMarketplaceItem,
  apiDeleteMarketplaceItem,
  apiPostAIDiagnose
} from '../api.js';

export async function mountCommunity(container) {
  container.innerHTML = '';
  container.classList.add('community-page');

  renderMobileHeader(container, 'Community & Marketplace');

  const state = getState();
  const currentLang = state.currentLang || 'en';
  const isUr = currentLang === 'ur';

  const main = document.createElement('div');
  main.className = 'main-content';
  container.appendChild(main);

  let activeTab = 'forum'; // 'forum' or 'marketplace'
  let posts = [];
  let marketplaceItems = [];
  let activeMarketCategory = 'All';
  let openCommentsPostId = null;
  let commentsCache = {}; // postId -> array of comments

  async function loadForumData() {
    const result = await apiGetCommunityPosts();
    if (result && result.status === 'success') {
      posts = result.data;
    }
  }

  async function loadMarketplaceData() {
    const result = await apiGetMarketplace(activeMarketCategory);
    if (result && result.status === 'success') {
      marketplaceItems = result.data;
    }
  }

  async function handleLike(postId, buttonEl) {
    const result = await apiLikePost(postId);
    if (result && result.status === 'success') {
      const action = result.action;
      const likesCount = result.likes_count;
      
      const counter = buttonEl.querySelector('.like-count');
      if (counter) {
        counter.textContent = likesCount;
      }
      
      if (action === 'liked') {
        showToast(isUr ? 'پوسٹ کو پسند کیا گیا' : 'Post liked!');
        buttonEl.style.color = 'var(--danger)';
      } else {
        showToast(isUr ? 'پسندیدگی ختم کر دی گئی' : 'Post unliked!');
        buttonEl.style.color = 'var(--fg-muted)';
      }
    }
  }

  async function toggleComments(postId, postCardEl) {
    const drawer = postCardEl.querySelector('.comments-drawer');
    if (openCommentsPostId === postId) {
      drawer.style.display = 'none';
      openCommentsPostId = null;
      return;
    }

    // Close previous if any
    const allDrawers = main.querySelectorAll('.comments-drawer');
    allDrawers.forEach(d => d.style.display = 'none');

    openCommentsPostId = postId;
    drawer.style.display = 'block';

    const listContainer = drawer.querySelector('.comments-list');
    listContainer.innerHTML = `<div style="text-align:center;padding:10px;"><i class="fas fa-spinner fa-spin" style="color:var(--accent);"></i></div>`;

    const result = await apiGetComments(postId);
    if (result && result.status === 'success') {
      commentsCache[postId] = result.data;
      renderCommentsList(postId, listContainer);
    } else {
      listContainer.innerHTML = `<div style="font-size:11px;color:var(--fg-muted);text-align:center;padding:10px;">Failed to load comments</div>`;
    }
  }

  function renderCommentsList(postId, listContainer) {
    const list = commentsCache[postId] || [];
    if (!list.length) {
      listContainer.innerHTML = `<div style="font-size:11px;color:var(--fg-muted);padding:8px 0;">${isUr ? 'کوئی تبصرہ نہیں ہے۔ پہلا تبصرہ کریں!' : 'No comments yet. Write the first comment!'}</div>`;
      return;
    }

    listContainer.innerHTML = list.map(c => {
      // Check if this is an AI Diagnostic comment
      const isAI = c.content.includes("Dr. Crop AI");
      return `
        <div style="padding:12px;background:${isAI ? 'rgba(46,204,64,0.04)' : 'rgba(255,255,255,0.02)'};border-radius:10px;border:1px solid ${isAI ? 'var(--accent)' : 'var(--border)'};margin-bottom:8px;box-shadow:${isAI ? '0 2px 10px rgba(46,204,64,0.06)' : 'none'};">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <strong style="font-size:12px;color:${isAI ? 'var(--accent)' : 'var(--fg)'};display:flex;align-items:center;gap:4px;">
              ${isAI ? '<i class="fas fa-robot"></i> ' : ''}${isUr ? (isAI ? 'ڈاکٹر کراپ اے آئی' : c.author_name) : (isAI ? 'Dr. Crop AI' : c.author_name)}
            </strong>
            <span style="font-size:10px;color:var(--fg-muted);">${formatDate(c.created_at)}</span>
          </div>
          <div style="font-size:12px;color:var(--fg);line-height:1.65;white-space:pre-line;">${c.content.replace('🤖 **[Dr. Crop AI — Expert Pathology Report]**', '')}</div>
        </div>
      `;
    }).join('');
  }

  async function submitComment(postId, postCardEl, inputEl) {
    const content = inputEl.value.trim();
    if (!content) return;

    const result = await apiCreateComment(postId, content);
    if (result && result.status === 'success') {
      inputEl.value = '';
      showToast(isUr ? 'تبصرہ شامل کر دیا گیا ہے' : 'Comment posted!');
      
      // Update comment count on parent card
      const commentCountBadge = postCardEl.querySelector('.comment-count-badge');
      if (commentCountBadge) {
        commentCountBadge.textContent = parseInt(commentCountBadge.textContent) + 1;
      }

      // Reload comments drawer
      const listContainer = postCardEl.querySelector('.comments-list');
      const comResult = await apiGetComments(postId);
      if (comResult && comResult.status === 'success') {
        commentsCache[postId] = comResult.data;
        renderCommentsList(postId, listContainer);
      }
    }
  }

  async function render() {
    main.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;flex-wrap:wrap;gap:12px;">
        <div>
          <h1 style="font-size:24px;font-weight:700;margin-bottom:4px;" class="${isUr ? 'urdu-text' : ''}">
            ${isUr ? 'برادری اور مارکیٹ' : 'Community & Marketplace'}
          </h1>
          <p style="font-size:13px;color:var(--fg-muted);" class="${isUr ? 'urdu-text' : ''}">
            ${isUr ? 'دوسرے کسانوں سے رابطہ کریں اور زراعتی اشیاء کی خرید و فروخت کریں' : 'Engage with fellow farmers in discussions and trade agricultural products.'}
          </p>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-sm ${activeTab === 'forum' ? 'btn-accent' : 'btn-outline'}" id="tabForumBtn" type="button">
            <i class="fas fa-users-viewfinder"></i> ${isUr ? 'برادری فورم' : 'Forum Feed'}
          </button>
          <button class="btn btn-sm ${activeTab === 'marketplace' ? 'btn-accent' : 'btn-outline'}" id="tabMarketBtn" type="button">
            <i class="fas fa-store"></i> ${isUr ? 'بازار / مارکیٹ' : 'Marketplace'}
          </button>
        </div>
      </div>
    `;

    if (activeTab === 'forum') {
      await renderForum();
    } else {
      await renderMarketplace();
    }

    // Attach Tab events
    main.querySelector('#tabForumBtn').addEventListener('click', () => { activeTab = 'forum'; render(); });
    main.querySelector('#tabMarketBtn').addEventListener('click', () => { activeTab = 'marketplace'; render(); });
  }

  async function renderForum() {
    const forumContainer = document.createElement('div');
    forumContainer.innerHTML = `
      <style>
        .forum-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          align-items: start;
        }
        
        .post-form-col {
          order: 2;
          display: none; /* Hidden by default on mobile */
        }
        
        .feed-col {
          order: 1;
        }

        .mobile-form-toggle {
          display: block;
          margin-bottom: 16px;
        }

        @media (min-width: 1024px) {
          .forum-grid {
            grid-template-columns: 1.8fr 1fr;
          }
          
          .post-form-col {
            order: 2;
            display: block !important;
          }
          
          .feed-col {
            order: 1;
          }

          .mobile-form-toggle {
            display: none;
          }
        }
      </style>

      <div class="mobile-form-toggle">
        <button id="toggleMobileFormBtn" class="btn btn-accent" style="width: 100%; height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fas fa-edit"></i> ${isUr ? 'سوال پوچھیں / پوسٹ کریں' : 'Write a Post / Ask a Question'}
        </button>
      </div>

      <div class="forum-grid">
        <!-- Feed List Panel -->
        <div class="feed-col" style="display:flex; flex-direction:column; gap:18px;">
          <h2 style="font-size:17px; font-weight:700; margin-bottom:2px; display:flex; align-items:center; gap:8px;">
            <i class="fas fa-comments" style="color:var(--accent);"></i> ${isUr ? 'برادری فورم فیڈ' : 'Discussions Feed'}
          </h2>
          
          <div id="forumPostsFeed" style="display:flex; flex-direction:column; gap:16px;">
            <div style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--accent);"></i></div>
          </div>
        </div>

        <!-- New Post Form Panel -->
        <div class="post-form-col" id="postFormCol">
          <div class="card" style="padding:20px; height:fit-content; border:1px solid var(--border);">
            <h2 style="font-size:16px; font-weight:700; margin-bottom:14px; color:var(--accent);">
              <i class="fas fa-pen-nib"></i> ${isUr ? 'نیا سوال پوچھیں' : 'Ask a Question'}
            </h2>
            <form id="newPostForm" style="display:flex; flex-direction:column; gap:12px;">
              <div>
                <label style="font-size:11px; color:var(--fg-muted); display:block; margin-bottom:4px; font-weight:600; text-transform:uppercase;">${isUr ? 'عنوان' : 'Title / Subject'}</label>
                <input type="text" id="postTitle" class="form-input" style="width:100%;" placeholder="${isUr ? 'گندم کی پیلی کنگی کے تدارک کے لیے کیا کروں؟' : 'e.g., Best nitrogen fertilizer ratio for Rice seedlings'}" required />
              </div>
              <div>
                <label style="font-size:11px; color:var(--fg-muted); display:block; margin-bottom:4px; font-weight:600; text-transform:uppercase;">${isUr ? 'زمرہ' : 'Category'}</label>
                <select id="postCategory" class="form-input" style="width:100%; background:var(--bg-input); cursor:pointer; color-scheme:dark;">
                  <option value="Disease Control">${isUr ? 'بیماریوں کا تدارک' : 'Disease Control'}</option>
                  <option value="Irrigation">${isUr ? 'آبپاشی' : 'Irrigation'}</option>
                  <option value="Fertilizer">${isUr ? 'کھادوں کا استعمال' : 'Fertilizers'}</option>
                  <option value="Seeds">${isUr ? 'بہترین بیج' : 'Seeds'}</option>
                  <option value="General" selected>${isUr ? 'عام گفتگو' : 'General'}</option>
                </select>
              </div>
              <div>
                <label style="font-size:11px; color:var(--fg-muted); display:block; margin-bottom:4px; font-weight:600; text-transform:uppercase;">${isUr ? 'اپنا سوال تفصیلاً لکھیں' : 'Explain your inquiry'}</label>
                <textarea id="postContent" class="form-input" rows="4" style="width:100%; resize:none;" placeholder="${isUr ? 'اپنی فصل کے مسائل اور علامات تفصیلاً بیان کریں...' : 'Explain symptoms, weather, crop age, and what treatments you have tried...'}" required></textarea>
              </div>
              <button class="btn btn-accent" type="submit" style="width:100%; padding:12px; margin-top:4px;">
                <i class="fas fa-paper-plane"></i> ${isUr ? 'فورم پر شیئر کریں' : 'Share on Forum'}
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    main.appendChild(forumContainer);

    // Toggle Mobile Form Event
    const toggleFormBtn = forumContainer.querySelector('#toggleMobileFormBtn');
    const postFormCol = forumContainer.querySelector('#postFormCol');
    if (toggleFormBtn && postFormCol) {
      toggleFormBtn.addEventListener('click', () => {
        const isHidden = window.getComputedStyle(postFormCol).display === 'none';
        postFormCol.style.display = isHidden ? 'block' : 'none';
        toggleFormBtn.innerHTML = isHidden
          ? `<i class="fas fa-xmark"></i> ${isUr ? 'بند کریں' : 'Close Question Form'}`
          : `<i class="fas fa-edit"></i> ${isUr ? 'نیا سوال پوچھیں / پوسٹ کریں' : 'Write a Post / Ask a Question'}`;
      });
    }

    // Load and render posts
    await loadForumData();

    const feedEl = forumContainer.querySelector('#forumPostsFeed');
    if (!posts.length) {
      feedEl.innerHTML = `
        <div class="card" style="padding:40px; text-align:center; color:var(--fg-muted);">
          <i class="fas fa-users-slash fa-3x" style="margin-bottom:12px; color:var(--border);"></i>
          <div>No discussions found. Be the first to share a post!</div>
        </div>
      `;
    } else {
      feedEl.innerHTML = posts.map(p => `
        <div class="card post-card" data-id="${p.id}" style="padding:20px; border-left:3px solid var(--accent); position:relative;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:36px; height:36px; border-radius:50%; background:rgba(46,204,64,0.1); color:var(--accent); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; border:1px solid var(--border);">
                ${p.author_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong style="font-size:13px; color:var(--fg);">${p.author_name}</strong>
                <div style="font-size:10px; color:var(--fg-muted);">${formatDate(p.created_at)}</div>
              </div>
            </div>
            <span class="badge badge-green" style="font-size:10px;">${p.category}</span>
          </div>
          
          <h3 style="font-size:15px; font-weight:700; color:var(--fg); margin-bottom:8px; line-height:1.4;">${p.title}</h3>
          <p style="font-size:13px; color:var(--fg); line-height:1.6; margin-bottom:14px; white-space:pre-wrap; text-align:justify;">${p.content}</p>
          
          <!-- Actions Footer -->
          <div style="display:flex; gap:12px 18px; flex-wrap:wrap; border-top:1px solid var(--border); padding-top:12px; margin-top:8px;">
            <button class="btn btn-sm btn-outline like-btn" style="border:none; background:none; padding:2px 8px; display:flex; align-items:center; gap:6px; cursor:pointer; color:${p.liked_by_user ? 'var(--danger)' : 'var(--fg-muted)'};" type="button">
              <i class="fas fa-heart"></i> Love (<span class="like-count">${p.likes_count || 0}</span>)
            </button>
            <button class="btn btn-sm btn-outline comment-btn" style="border:none; background:none; padding:2px 8px; display:flex; align-items:center; gap:6px; cursor:pointer; color:var(--fg-muted);" type="button">
              <i class="fas fa-comment"></i> Comments (<span class="comment-count-badge">${p.comment_count || 0}</span>)
            </button>
            <button class="btn btn-sm btn-outline ai-diagnose-btn" style="border:none; background:none; padding:2px 8px; display:flex; align-items:center; gap:6px; cursor:pointer; color:var(--accent); font-weight:600;" type="button">
              <i class="fas fa-wand-magic-sparkles"></i> ${isUr ? 'اے آئی معائنہ' : 'AI Diagnose'}
            </button>
          </div>

          <!-- Comments Drawer (Hidden initially) -->
          <div class="comments-drawer" style="display:none; margin-top:16px; padding-top:14px; border-top:1px dashed var(--border);">
            <div class="comments-list" style="max-height:220px; overflow-y:auto; margin-bottom:12px; padding-right:4px;"></div>
            <div style="display:flex; gap:8px;">
              <input type="text" class="form-input comment-input" style="flex:1; padding:8px 12px; font-size:12px;" placeholder="${isUr ? 'تبصرہ لکھیں...' : 'Write a comment...'}" />
              <button class="btn btn-sm btn-accent send-comment-btn" type="button" style="padding:8px 14px;"><i class="fas fa-paper-plane"></i></button>
            </div>
          </div>
        </div>
      `).join('');

      // Attach feed item listeners
      feedEl.querySelectorAll('.post-card').forEach(card => {
        const id = parseInt(card.dataset.id);
        
        // Like listener
        card.querySelector('.like-btn').addEventListener('click', (e) => {
          handleLike(id, e.currentTarget);
        });

        // Toggle comment drawer listener
        card.querySelector('.comment-btn').addEventListener('click', () => {
          toggleComments(id, card);
        });

        // Submit comment listener
        const commentInput = card.querySelector('.comment-input');
        card.querySelector('.send-comment-btn').addEventListener('click', () => {
          submitComment(id, card, commentInput);
        });
        commentInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') submitComment(id, card, commentInput);
        });

        // Dr. Crop AI Diagnosis trigger
        const aiDiagBtn = card.querySelector('.ai-diagnose-btn');
        if (aiDiagBtn) {
          aiDiagBtn.addEventListener('click', async () => {
            aiDiagBtn.disabled = true;
            aiDiagBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isUr ? 'تشخیص ہو رہی ہے...' : 'Diagnosing...'}`;
            
            const res = await apiPostAIDiagnose(id);
            
            aiDiagBtn.disabled = false;
            aiDiagBtn.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> ${isUr ? 'اے آئی معائنہ' : 'AI Diagnose'}`;

            if (res && res.status === 'success') {
              showToast(isUr ? 'ڈاکٹر کراپ اے آئی نے رپورٹ شامل کر دی ہے' : 'Dr. Crop AI has diagnosed the issue and posted a reply!');
              
              // Dynamically update comment badge
              const badge = card.querySelector('.comment-count-badge');
              if (badge) {
                badge.textContent = parseInt(badge.textContent) + 1;
              }

              // Load and open comment drawer immediately
              openCommentsPostId = null; // force toggle
              toggleComments(id, card);
            }
          });
        }
      });
    }

    // Attach Create Post Form submission listener
    forumContainer.querySelector('#newPostForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = forumContainer.querySelector('#postTitle').value.trim();
      const content = forumContainer.querySelector('#postContent').value.trim();
      const category = forumContainer.querySelector('#postCategory').value;

      if (!title || !content) return;

      const submitBtn = forumContainer.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Posting...`;

      const result = await apiCreateCommunityPost(title, content, category);
      if (result && result.status === 'success') {
        showToast(isUr ? 'سوال کامیابی سے شیئر کر دیا گیا ہے' : 'Question posted successfully on forum!');
        render(); // Reload page
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Share on Forum`;
      }
    });
  }

  async function renderMarketplace() {
    const marketContainer = document.createElement('div');
    marketContainer.innerHTML = `
      <!-- Filters and List Add Block -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;" id="marketCategoryFilters">
          ${['All', 'Seeds', 'Fertilizer', 'Machinery', 'Crops', 'Other'].map(cat => `
            <button class="btn btn-sm ${activeMarketCategory === cat ? 'btn-accent' : 'btn-outline'} filter-cat-btn" data-category="${cat}" type="button" style="white-space:nowrap;padding:6px 14px;">
              ${cat}
            </button>
          `).join('')}
        </div>
        <button class="btn btn-sm btn-accent" id="addMarketItemBtn" type="button">
          <i class="fas fa-cart-plus"></i> ${isUr ? 'سامان فروخت کے لیے ڈالیں' : 'List a Product'}
        </button>
      </div>

      <!-- Bazaar Grid -->
      <div id="marketplaceGrid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:20px;">
        <div style="text-align:center;grid-column:1/-1;padding:50px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--accent);"></i></div>
      </div>

      <!-- List Item Modal overlay -->
      <div class="modal-overlay" id="marketProductModal" style="display:none;">
        <div class="modal" style="max-width:480px;">
          <button class="icon-btn" id="closeMarketModalBtn" type="button" style="position:absolute;top:14px;right:14px;background:none;border:none;color:var(--fg-muted);"><i class="fas fa-xmark fa-lg"></i></button>
          <h2 style="font-size:18px;font-weight:800;color:var(--accent);margin-bottom:16px;">
            <i class="fas fa-cart-plus"></i> ${isUr ? 'فروخت کے لیے چیز شامل کریں' : 'List Product for Sale'}
          </h2>
          <form id="createMarketItemForm" style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label style="font-size:11px;color:var(--fg-muted);display:block;margin-bottom:4px;font-weight:600;text-transform:uppercase;">${isUr ? 'چیز کا نام' : 'Product Title / Name'}</label>
              <input type="text" id="marketTitle" class="form-input" style="width:100%;" placeholder="${isUr ? 'کھاد ڈالنے کا بہترین بیج' : 'e.g., Premium Wheat Seeds (Inqalab-91)'}" required />
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label style="font-size:11px;color:var(--fg-muted);display:block;margin-bottom:4px;font-weight:600;text-transform:uppercase;">${isUr ? 'قیمت' : 'Price'}</label>
                <input type="text" id="marketPrice" class="form-input" style="width:100%;" placeholder="e.g. Rs. 4,500/bag" required />
              </div>
              <div>
                <label style="font-size:11px;color:var(--fg-muted);display:block;margin-bottom:4px;font-weight:600;text-transform:uppercase;">${isUr ? 'زمرہ' : 'Category'}</label>
                <select id="marketCategory" class="form-input" style="width:100%;background:var(--bg-input);cursor:pointer;color-scheme:dark;">
                  <option value="Seeds">${isUr ? 'بیج (Seeds)' : 'Seeds'}</option>
                  <option value="Fertilizer">${isUr ? 'کھاد (Fertilizer)' : 'Fertilizer'}</option>
                  <option value="Machinery">${isUr ? 'مشینری (Machinery)' : 'Machinery'}</option>
                  <option value="Crops">${isUr ? 'فصلیں (Crops)' : 'Crops'}</option>
                  <option value="Other">${isUr ? 'دیگر (Other)' : 'Other'}</option>
                </select>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label style="font-size:11px;color:var(--fg-muted);display:block;margin-bottom:4px;font-weight:600;text-transform:uppercase;">${isUr ? 'علاقہ / جگہ' : 'Location'}</label>
                <input type="text" id="marketLocation" class="form-input" style="width:100%;" placeholder="e.g. Faisalabad" required />
              </div>
              <div>
                <label style="font-size:11px;color:var(--fg-muted);display:block;margin-bottom:4px;font-weight:600;text-transform:uppercase;">${isUr ? 'فون نمبر / رابطہ' : 'Contact Phone'}</label>
                <input type="text" id="marketPhone" class="form-input" style="width:100%;" placeholder="e.g. 03001234567" required />
              </div>
            </div>
            <div>
              <label style="font-size:11px;color:var(--fg-muted);display:block;margin-bottom:4px;font-weight:600;text-transform:uppercase;">${isUr ? 'تفصیل' : 'Description'}</label>
              <textarea id="marketDescription" class="form-input" rows="3" style="width:100%;resize:none;" placeholder="${isUr ? 'چیز کی کوالٹی، وزن، یا دیگر تفصیلات لکھیں...' : 'List stock quantities, organic quality, or lease duration...'}" required></textarea>
            </div>
            <div>
              <label style="font-size:11px;color:var(--fg-muted);display:block;margin-bottom:4px;font-weight:600;text-transform:uppercase;">${isUr ? 'مخصوص تصویر منتخب کریں (سیمپل)' : 'Select Stock Photo'}</label>
              <select id="marketImage" class="form-input" style="width:100%;background:var(--bg-input);cursor:pointer;color-scheme:dark;">
                <option value="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400">${isUr ? 'گندم کے بیج' : 'Seeds (Wheat/Grain)'}</option>
                <option value="https://images.unsplash.com/photo-1628352081506-83c43123ed6d?w=400">${isUr ? 'کھاد بیگ' : 'Fertilizers Bag'}</option>
                <option value="https://images.unsplash.com/photo-1594142404563-64cccaf5a10f?w=400">${isUr ? 'ٹریکٹر / مشینری' : 'Machinery & Tractor'}</option>
                <option value="https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=400">${isUr ? 'سرسبز کھیت / فصلیں' : 'Harvested Crops'}</option>
              </select>
            </div>
            <button class="btn btn-accent" type="submit" style="width:100%;padding:12px;margin-top:6px;">
              <i class="fas fa-check"></i> ${isUr ? 'مارکیٹ میں شائع کریں' : 'Publish Product'}
            </button>
          </form>
        </div>
      </div>
    `;

    main.appendChild(marketContainer);

    // Load marketplace listings
    await loadMarketplaceData();

    const gridEl = marketContainer.querySelector('#marketplaceGrid');
    if (!marketplaceItems.length) {
      gridEl.innerHTML = `
        <div class="card" style="padding:40px;text-align:center;color:var(--fg-muted);grid-column:1/-1;">
          <i class="fas fa-box-open fa-3x" style="margin-bottom:12px;color:var(--border);"></i>
          <div>No products listed in this category yet. Be the first to add one!</div>
        </div>
      `;
    } else {
      gridEl.innerHTML = marketplaceItems.map(item => {
        const isOwner = item.user_id === state.user.id;
        const img = item.image_url || 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400';
        return `
          <div class="card product-card" style="padding:0;overflow:hidden;border:1px solid var(--border);display:flex;flex-direction:column;justify-content:between;transition:transform 0.2s;">
            <div style="position:relative;height:140px;background:var(--bg-input);">
              <img src="${img}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400'"/>
              <span class="badge badge-green" style="position:absolute;top:10px;left:10px;font-size:9px;text-transform:uppercase;font-weight:700;">${item.category}</span>
              ${isOwner ? `
                <button class="icon-btn delete-listing-btn" data-id="${item.id}" type="button" style="position:absolute;top:10px;right:10px;background:rgba(239,68,68,0.9);color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;" title="Delete Listing">
                  <i class="fas fa-trash-can fa-xs"></i>
                </button>
              ` : ''}
            </div>
            
            <div style="padding:16px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
              <div>
                <div style="font-size:15px;font-weight:800;color:var(--fg);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.title}</div>
                <div style="font-size:16px;font-weight:900;color:var(--accent);margin-bottom:8px;">${item.price}</div>
                <p style="font-size:12px;color:var(--fg-muted);line-height:1.5;margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${item.description || 'No description provided.'}</p>
              </div>

              <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--fg-muted);margin-bottom:12px;">
                  <span><i class="fas fa-user-tie"></i> ${item.seller_name}</span>
                  <span><i class="fas fa-location-dot"></i> ${item.location}</span>
                </div>
                
                <a href="https://wa.me/${item.phone.replace(/[^0-9]/g, '') || '923000000000'}" target="_blank" class="btn btn-accent" style="width:100%;padding:10px;display:flex;align-items:center;justify-content:center;gap:6px;text-decoration:none;font-weight:600;font-size:12px;">
                  <i class="fab fa-whatsapp fa-lg"></i> Contact Seller
                </a>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Delete listener
      gridEl.querySelectorAll('.delete-listing-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.id);
          if (confirm(isUr ? 'کیا آپ واقعی اس لسٹنگ کو حذف کرنا چاہتے ہیں؟' : 'Are you sure you want to delete this listing?')) {
            const result = await apiDeleteMarketplaceItem(id);
            if (result && result.status === 'success') {
              showToast(isUr ? 'لسٹنگ کامیابی سے حذف ہو گئی ہے' : 'Listing deleted successfully!');
              render();
            }
          }
        });
      });
    }

    // Modal Control Events
    const modal = marketContainer.querySelector('#marketProductModal');
    const openBtn = marketContainer.querySelector('#addMarketItemBtn');
    const closeBtn = marketContainer.querySelector('#closeMarketModalBtn');

    openBtn.addEventListener('click', () => { modal.style.display = 'flex'; });
    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    // Category Filter Buttons
    marketContainer.querySelectorAll('.filter-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeMarketCategory = btn.dataset.category;
        render();
      });
    });

    // Form Submission
    marketContainer.querySelector('#createMarketItemForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
        title: marketContainer.querySelector('#marketTitle').value.trim(),
        price: marketContainer.querySelector('#marketPrice').value.trim(),
        category: marketContainer.querySelector('#marketCategory').value,
        location: marketContainer.querySelector('#marketLocation').value.trim(),
        phone: marketContainer.querySelector('#marketPhone').value.trim(),
        description: marketContainer.querySelector('#marketDescription').value.trim(),
        image_url: marketContainer.querySelector('#marketImage').value
      };

      const submitBtn = marketContainer.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Publishing...`;

      const result = await apiCreateMarketplaceItem(payload);
      if (result && result.status === 'success') {
        showToast(isUr ? 'پروڈکٹ مارکیٹ میں شائع ہو گئی ہے' : 'Product listed successfully in bazaar!');
        modal.style.display = 'none';
        render();
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fas fa-check"></i> Publish Product`;
      }
    });
  }

  // Initial render
  await render();

  return () => {
    container.classList.remove('community-page');
  };
}
