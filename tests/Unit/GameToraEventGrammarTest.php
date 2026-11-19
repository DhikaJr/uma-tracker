<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\GameToraSyncService;
use Exception;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class GameToraEventGrammarTest extends TestCase
{
    #[DataProvider('liveEventTuples')]
    public function test_accepts_live_event_tuples_with_integer_or_positive_numeric_string_ids(array $tuple): void
    {
        $this->validateEventTuple($tuple);
        $eventPosition = $tuple[0] === 'mo_ev' ? 2 : 1;
        $tuple[$eventPosition] = (string) $tuple[$eventPosition];
        $this->validateEventTuple($tuple);
        $this->addToAssertionCount(2);
    }

    #[DataProvider('invalidEventTuples')]
    public function test_rejects_invalid_event_tuples(array $tuple): void
    {
        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Dataset evolusi GameTora memuat syarat yang tidak valid');

        $this->validateEventTuple($tuple);
    }

    /** @return array<string, array{array}> */
    public static function liveEventTuples(): array
    {
        return [
            'ev' => [['ev', 501004515]],
            'ev_cn_on' => [['ev_cn_on', 501002524, 0, 2]],
            'ev_ac_on' => [['ev_ac_on', 501016524, [2, 3, 4], 2]],
            'evn' => [['evn', 501040524, 1]],
            'p_ev_s' => [['p_ev_s', 501046525]],
            'ev_trc_t' => [['ev_trc_t', 501037524, 1]],
            'mo_ev' => [['mo_ev', 4, 501060801]],
        ];
    }

    /** @return iterable<string, array{array}> */
    public static function invalidEventTuples(): iterable
    {
        foreach (self::liveEventTuples() as $operator => [$tuple]) {
            $eventPosition = $operator === 'mo_ev' ? 2 : 1;
            $missing = $tuple;
            array_splice($missing, $eventPosition, 1);
            yield "{$operator} missing ID" => [$missing];
            yield "{$operator} extra operand" => [[...$tuple, false]];
            foreach ([
                'integer zero' => 0, 'negative integer' => -5, 'text' => 'damaged-id', 'null' => null, 'array' => [],
                'string zero' => '0', 'negative string' => '-5',
            ] as $description => $invalidId) {
                $invalid = $tuple;
                $invalid[$eventPosition] = $invalidId;

                yield "{$operator} {$description}" => [$invalid];
            }
            if (count($tuple) > 2 && $operator !== 'mo_ev') {
                yield "{$operator} missing companion" => [array_slice($tuple, 0, -1)];
            }
        }

        foreach ([[true], ['damaged'], [2, null], 2, [], ['choice' => 2]] as $index => $invalidChoices) {
            yield "ev_ac_on invalid list {$index}" => [['ev_ac_on', 501016524, $invalidChoices, 2]];
        }
    }

    private function validateEventTuple(array $tuple): void
    {
        $service = new ReflectionClass(GameToraSyncService::class);
        $service->getMethod('validateEvolutionRequirements')
            ->invoke($service->newInstanceWithoutConstructor(), [[$tuple]], 100201, 100201311);
    }
}
