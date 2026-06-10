package com.enjoytrip.backend.domain.survey.dto;

import com.enjoytrip.backend.domain.survey.entity.UserPreference;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserPreferenceResponse {
    private double activity;
    private double food;
    private double pace;
    private double urbanNature;
    private double timePref;

    public static UserPreferenceResponse from(UserPreference p) {
        return UserPreferenceResponse.builder()
                .activity(p.getActivity())
                .food(p.getFood())
                .pace(p.getPace())
                .urbanNature(p.getUrbanNature())
                .timePref(p.getTimePref())
                .build();
    }
}
