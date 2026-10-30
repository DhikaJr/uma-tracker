<?php

namespace App\Http\Requests;

use App\Models\GachaBanner;
use App\Support\UmaCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreGachaPullRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'banner_type' => ['required', 'string', 'in:character,support_card'],
            'gacha_banner_id' => ['required', 'integer', 'exists:gacha_banners,id'],
            'pull_type' => ['required', 'string', 'in:single,multi_10,ticket,custom_ticket'],
            'item_name' => ['required', 'string', 'max:255'],
            'rarity' => ['required', 'string', 'in:R,SR,SSR'],
            'is_rate_up' => ['nullable', 'boolean'],
            'pulled_at' => ['nullable', 'date', 'before_or_equal:today'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'gacha_banner_id.required' => 'Kolom Banner JP 2026 wajib dipilih. Tarikan tanpa banner tidak dapat diinput.',
            'gacha_banner_id.exists' => 'Banner JP 2026 yang dipilih tidak ditemukan.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $bannerId = $this->input('gacha_banner_id');
        if ($bannerId) {
            $banner = GachaBanner::find($bannerId);
            if ($banner && $banner->isTwinkle()) {
                $this->merge(['is_rate_up' => false]);
            }
        }
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $bannerId = $this->input('gacha_banner_id');
            $banner = $bannerId ? GachaBanner::find($bannerId) : null;
            $bannerType = (string) $this->input('banner_type');

            if ($banner && $bannerType !== '' && $banner->banner_type !== $bannerType) {
                $expected = $banner->banner_type === 'character' ? 'Karakter' : 'Support Card';
                $actual = $bannerType === 'character' ? 'Karakter' : 'Support Card';
                $validator->errors()->add('gacha_banner_id', "Banner '{$banner->name}' adalah banner {$expected}, tidak dapat digunakan untuk pull {$actual}.");
            }

            $itemName = trim((string) $this->input('item_name'));
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

            $isRateUp = filter_var($this->input('is_rate_up'), FILTER_VALIDATE_BOOLEAN);
            if (! $isRateUp) {
                return;
            }

            $rarity = (string) $this->input('rarity');
            if ($rarity === 'R') {
                $validator->errors()->add('is_rate_up', 'Kartu dengan rarity R tidak dapat dijadikan rate-up.');

                return;
            }

            if ($banner && ! $banner->isItemRateUp($itemName)) {
                $bannerName = $banner->name;
                $validator->errors()->add('is_rate_up', "Kartu '{$itemName}' bukan merupakan pilihan rate-up pada banner '{$bannerName}'.");
            }
        });
    }
}
