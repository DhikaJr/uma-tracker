export const EVENT_REWARD_DEFAULTS = Object.freeze({
    storyEvent: 2250,
    legendRaceOpponent: 150,
    pakaliveStream: 300,
    g1MonthlyEstimate: 300,
});

const nonNegativeInteger = value => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export function calculateEventIncome(config, { diffDays, monthsCount }) {
    const future = diffDays > 0;
    const storyCarats = future ? nonNegativeInteger(config.story_events_count) * EVENT_REWARD_DEFAULTS.storyEvent : 0;
    const legendCarats = future ? nonNegativeInteger(config.legend_races_count) * EVENT_REWARD_DEFAULTS.legendRaceOpponent : 0;
    const g1Carats = future && config.g1_bonus_enabled ? nonNegativeInteger(monthsCount) * EVENT_REWARD_DEFAULTS.g1MonthlyEstimate : 0;
    const pakaliveEstimate = nonNegativeInteger(config.pakalive_carats_per_stream ?? EVENT_REWARD_DEFAULTS.pakaliveStream);
    const pakaliveCarats = future ? nonNegativeInteger(config.pakalive_streams_count) * pakaliveEstimate : 0;
    const campaignCarats = future ? nonNegativeInteger(config.campaign_bonus_carats) : 0;
    const unexpectedCarats = future ? nonNegativeInteger(config.unexpected_bonus_carats) : 0;

    return {
        storyCarats,
        legendCarats,
        g1Carats,
        pakaliveCarats,
        campaignCarats,
        unexpectedCarats,
        totalEventCarats: storyCarats + legendCarats + g1Carats + pakaliveCarats + campaignCarats + unexpectedCarats,
    };
}
