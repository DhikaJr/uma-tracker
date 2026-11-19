export function isScenarioReleaseBanner(banner) {
    if (!banner) return false;
    if (banner.category === 'scenario_release') return true;
    const startDate = String(banner.start_date || '');
    return startDate.includes('10-26');
}

export function isGachaBannerSelectable(banner) {
    return Array.isArray(banner?.featured_items)
        && banner.featured_items.some(item => typeof item === 'string' && item.trim() !== '');
}

export function groupGachaBannerOptions(banners, typeFilter) {
    const filtered = banners.filter(b => isGachaBannerSelectable(b) && (!typeFilter || b.banner_type === typeFilter));

    return {
        anni: filtered.filter(b => b.category === 'anniversary' || isScenarioReleaseBanner(b)),
        premium: filtered.filter(b => b.category === 'premium' && !isScenarioReleaseBanner(b)),
        twinkle: filtered.filter(b => b.category === 'twinkle'),
        selectUp: typeFilter === 'character' ? [] : filtered.filter(b => b.category === 'select_rate_up' && b.banner_type !== 'character'),
        standard: filtered.filter(b => b.category === 'standard' && !isScenarioReleaseBanner(b)),
    };
}
