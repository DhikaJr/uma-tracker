<?php

namespace App\Http\Requests;

use App\Models\GachaBanner;
use App\Models\GachaPull;
use App\Support\UmaCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateGachaPullRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'banner_type' => ['sometimes', 'required', 'string', 'in:character,support_card'],
            'gacha_banner_id' => ['sometimes', 'required', 'integer', 'exists:gacha_banners,id'],
            'pull_type' => ['sometimes', 'required', 'string', 'in:single,multi_10,ticket,custom_ticket'],
            'item_name' => ['sometimes', 'required', 'string', 'max:255'],
            'rarity' => ['sometimes', 'required', 'string', 'in:R,SR,SSR'],
            'is_rate_up' => ['nullable', 'boolean'],
            'pulled_at' => ['sometimes', 'required', 'date', 'before_or_equal:today'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $pullId = $this->route('id') ?? $this->route('pull');
            $pull = $pullId ? GachaPull::find($pullId) : null;
            $bannerId = $this->input('gacha_banner_id') ?? $pull?->gacha_banner_id;
            $bannerType = (string) ($this->input('banner_type') ?? $pull?->banner_type ?? '');

            if ($bannerId && $bannerType !== '') {
                $banner = GachaBanner::find($bannerId);
                if ($banner && $banner->banner_type !== $bannerType) {
                    $expected = $banner->banner_type === 'character' ? 'Karakter' : 'Support Card';
                    $actual = $bannerType === 'character' ? 'Karakter' : 'Support Card';
                    $validator->errors()->add('gacha_banner_id', "Banner '{$banner->name}' adalah banner {$expected}, tidak dapat digunakan untuk pull {$actual}.");
                }
            }

            $itemName = trim((string) ($this->input('item_name') ?? $pull?->item_name ?? ''));
            if ($bannerType === 'support_card') {
                $charactersCatalog = array_flip(UmaCatalog::getCharacters());
                if (isset($charactersCatalog[$itemName])) {
                    $validator->errors()->add('item_name', "Item '{$itemName}' adalah Karakter Uma Musume, bukan Support Card. Harap pilih banner Karakter.");
                }
            } elseif ($bannerType === 'character') {
                $supportCardsCatalog = array_flip(UmaCatalog::getSupportCards());
                if (isset($supportCardsCatalog[$itemName])) {
                    $validator->errors()->add('item_name', "Item '{$itemName}' adalah Support Card, bukan Karakter. Harap pilih banner Support Card.");
                }
            }

            // Changing the pull's identity normalizes its flag against the destination.
            if ($this->hasAny(['gacha_banner_id', 'item_name', 'rarity']) || ! $this->boolean('is_rate_up')) {
                return;
            }

            $banner = $bannerId ? GachaBanner::find($bannerId) : null;
            if ($pull?->rarity === 'R' || ($banner && ! $banner->isTwinkle() && ! $banner->isItemRateUp($itemName))) {
                $validator->errors()->add('is_rate_up', 'Tarikan ini tidak memenuhi syarat rate-up pada banner yang dipilih.');
            }

        });
    }
}
