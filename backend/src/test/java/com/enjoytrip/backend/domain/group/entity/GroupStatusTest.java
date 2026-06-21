package com.enjoytrip.backend.domain.group.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

class GroupStatusTest {

    @Test
    void fromDatesReturnsPlanningBeforeStartDate() {
        GroupStatus status = GroupStatus.fromDates(
                LocalDate.of(2026, 7, 1),
                LocalDate.of(2026, 7, 3),
                LocalDate.of(2026, 6, 30)
        );

        assertEquals(GroupStatus.PLANNING, status);
    }

    @Test
    void fromDatesReturnsInProgressBetweenStartAndEndDate() {
        GroupStatus status = GroupStatus.fromDates(
                LocalDate.of(2026, 7, 1),
                LocalDate.of(2026, 7, 3),
                LocalDate.of(2026, 7, 2)
        );

        assertEquals(GroupStatus.IN_PROGRESS, status);
    }

    @Test
    void fromDatesReturnsCompletedAfterEndDate() {
        GroupStatus status = GroupStatus.fromDates(
                LocalDate.of(2026, 7, 1),
                LocalDate.of(2026, 7, 3),
                LocalDate.of(2026, 7, 4)
        );

        assertEquals(GroupStatus.COMPLETED, status);
    }
}
