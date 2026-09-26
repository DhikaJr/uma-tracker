<?php

namespace App\Http\Requests;

use App\Models\GachaBanner;
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
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $bannerId = $this->input('gacha_banner_id');
            $banner = $bannerId ? GachaBanner::find($bannerId) : null;
            $pulls = $this->input('pulls', []);

            if (! is_array($pulls)) {
                return;
            }

            foreach ($pulls as $index => $pull) {
                $isRateUp = filter_var($pull['is_rate_up'] ?? false, FILTER_VALIDATE_BOOLEAN);
                if (! $isRateUp) {
                    continue;
                }

                $slotNumber = $index + 1;
                $rarity = (string) ($pull['rarity'] ?? '');
                if ($rarity === 'R') {
                    $validator->errors()->add("pulls.{$index}.is_rate_up", "Kartu dengan rarity R pada slot #{$slotNumber} tidak dapat dijadikan rate-up.");

                    continue;
                }

                $itemName = (string) ($pull['item_name'] ?? '');
                if ($banner && ! $banner->isItemRateUp($itemName)) {
                    $bannerName = $banner->name;
                    $validator->errors()->add("pulls.{$index}.is_rate_up", "Kartu '{$itemName}' pada slot #{$slotNumber} bukan merupakan pilihan rate-up pada banner '{$bannerName}'.");
                }
            }
        });
    }
}
