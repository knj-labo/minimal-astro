<script>
  export let title = '';
  export let url = '';
  
  let showCopied = false;
  
  async function handleShare() {
    const shareData = {
      title: title,
      url: url || window.location.href
    };
    
    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        showCopied = true;
        setTimeout(() => {
          showCopied = false;
        }, 2000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  }
</script>

<div class="share-container">
  <button on:click={handleShare} class="share-button">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
      <polyline points="16 6 12 2 8 6"></polyline>
      <line x1="12" y1="2" x2="12" y2="15"></line>
    </svg>
    Share
  </button>
  
  {#if showCopied}
    <span class="copied-message">Link copied!</span>
  {/if}
</div>

<style>
  .share-container {
    position: relative;
    display: inline-block;
  }

  .share-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.2s;
  }

  .share-button:hover {
    background-color: #2563eb;
    transform: translateY(-1px);
  }

  .share-button:active {
    transform: translateY(0);
  }

  .share-button svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .copied-message {
    position: absolute;
    top: -2rem;
    left: 50%;
    transform: translateX(-50%);
    background-color: #10b981;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    white-space: nowrap;
    animation: fadeIn 0.2s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-0.5rem);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
</style>