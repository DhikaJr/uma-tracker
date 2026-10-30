<?php

namespace App\Http\Requests;

use App\Models\GachaBanner;
use App\Support\UmaCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class BatchGachaPullRequest extends FormRequest
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
            'pull_type' => ['nullable', 'string', 'in:single,multi_10,ticket,custom_ticket'],
            'pulled_at' => ['nullable', 'date', 'before_or_equal:today'],
            'pulls' => ['required', 'array', 'min:1', 'max:50'],
            'pulls.*.item_name' => ['required', 'string', 'max:255'],
            'pulls.*.rarity' => ['required', 'string', 'in:R,SR,SSR'],
            'pulls.*.is_rate_up' => ['nullable', 'boolean'],
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
            if ($banner && $banner->isTwinkle() && is_array($this->input('pulls'))) {
                $pulls = array_map(function ($pull) {
                    if (is_array($pull)) {
                        $pull['is_rate_up'] = false;
                    }

                    return $pull;
                }, $this->input('pulls'));
                $this->merge(['pulls' => $pulls]);
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
            $pulls = $this->input('pulls', []);

            if ($banner && $bannerType !== '' && $banner->banner_type !== $bannerType) {
                $expected = $banner->banner_type === 'character' ? 'Karakter' : 'Support Card';
                $actual = $bannerType === 'character' ? 'Karakter' : 'Support Card';
                $validator->errors()->add('gacha_banner_id', "Banner '{$banner->name}' adalah banner {$expected}, tidak dapat digunakan untuk pull {$actual}.");
            }

            if (! is_array($pulls)) {
                return;
            }

            $charactersCatalog = null;
            $supportCardsCatalog = null;

            foreach ($pulls as $index => $pull) {
                $slotNumber = $index + 1;
                $itemName = trim((string) ($pull['item_name'] ?? ''));

                if ($bannerType === 'support_card') {
                    if ($charactersCatalog === null) {
                        $charactersCatalog = array_flip(UmaCatalog::getCharacters());
                    }
                    if (isset($charactersCatalog[$itemName])) {
                        $validator->errors()->add("pulls.{$index}.item_name", "Item '{$itemName}' pada slot #{$slotNumber} adalah Karakter Uma Musume, bukan Support Card. Harap pilih banner Karakter.");
                    }
                } elseif ($bannerType === 'character') {
                    if ($supportCardsCatalog === null) {
                        $supportCardsCatalog = array_flip(UmaCatalog::getSupportCards());
                    }
                    if (isset($supportCardsCatalog[$itemName])) {
                        $validator->errors()->add("pulls.{$index}.item_name", "Item '{$itemName}' pada slot #{$slotNumber} adalah Support Card, bukan Karakter. Harap pilih banner Support Card.");
                    }
                }

                $isRateUp = filter_var($pull['is_rate_up'] ?? false, FILTER_VALIDATE_BOOLEAN);
                if (! $isRateUp) {
                    continue;
                }

                $rarity = (string) ($pull['rarity'] ?? '');
                if ($rarity === 'R') {
                    $validator->errors()->add("pulls.{$index}.is_rate_up", "Kartu dengan rarity R pada slot #{$slotNumber} tidak dapat dijadikan rate-up.");

                    continue;
                }

                if ($banner && ! $banner->isItemRateUp($itemName)) {
                    $bannerName = $banner->name;
                    $validator->errors()->add("pulls.{$index}.is_rate_up", "Kartu '{$itemName}' pada slot #{$slotNumber} bukan merupakan pilihan rate-up pada banner '{$bannerName}'.");
                }
            }
        });
    }
}
