package com.enjoytrip.backend.domain.place.entity;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

class PlaceCategoryTest {

    @Test
    void includedTypeMapsToGoogleType() {
        assertThat(PlaceCategory.LODGING.getIncludedType()).isEqualTo("lodging");
        assertThat(PlaceCategory.RESTAURANT.getIncludedType()).isEqualTo("restaurant");
        assertThat(PlaceCategory.CAFE.getIncludedType()).isEqualTo("cafe");
        assertThat(PlaceCategory.TOURIST_ATTRACTION.getIncludedType()).isEqualTo("tourist_attraction");
        assertThat(PlaceCategory.SHOPPING.getIncludedType()).isEqualTo("shopping_mall");
    }

    @Test
    void etcHasNoIncludedType() {
        assertThat(PlaceCategory.ETC.hasIncludedType()).isFalse();
        assertThat(PlaceCategory.ETC.getIncludedType()).isNull();
    }

    @Test
    void fromGoogleTypesPrefersLodgingThenCafeThenRestaurant() {
        assertThat(PlaceCategory.fromGoogleTypes(List.of("lodging", "point_of_interest")))
                .isEqualTo(PlaceCategory.LODGING);
        // cafe는 보통 restaurant/food와 함께 오므로 cafe를 우선한다.
        assertThat(PlaceCategory.fromGoogleTypes(List.of("cafe", "restaurant", "food")))
                .isEqualTo(PlaceCategory.CAFE);
        assertThat(PlaceCategory.fromGoogleTypes(List.of("restaurant", "food")))
                .isEqualTo(PlaceCategory.RESTAURANT);
    }

    @Test
    void fromGoogleTypesMapsAttractionAndShopping() {
        assertThat(PlaceCategory.fromGoogleTypes(List.of("museum")))
                .isEqualTo(PlaceCategory.TOURIST_ATTRACTION);
        assertThat(PlaceCategory.fromGoogleTypes(List.of("park")))
                .isEqualTo(PlaceCategory.TOURIST_ATTRACTION);
        assertThat(PlaceCategory.fromGoogleTypes(List.of("shopping_mall")))
                .isEqualTo(PlaceCategory.SHOPPING);
        assertThat(PlaceCategory.fromGoogleTypes(List.of("store")))
                .isEqualTo(PlaceCategory.SHOPPING);
    }

    @Test
    void fromGoogleTypesFallsBackToEtc() {
        assertThat(PlaceCategory.fromGoogleTypes(List.of())).isEqualTo(PlaceCategory.ETC);
        assertThat(PlaceCategory.fromGoogleTypes(null)).isEqualTo(PlaceCategory.ETC);
        assertThat(PlaceCategory.fromGoogleTypes(List.of("bank", "atm"))).isEqualTo(PlaceCategory.ETC);
    }
}
