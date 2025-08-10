package com.project.recommender_pro.dto;

import java.util.List;
import lombok.Data; // Optional: Use Lombok for boilerplate reduction
import lombok.NoArgsConstructor;

@Data // Lombok: Generates getters, setters, toString, equals, hashCode
@NoArgsConstructor // Lombok: Needed for Jackson deserialization
public class LikeRequestDto {

    private String trackUri;
    private String trackName;
    private String artistName;
    private List<String> tags; // Expects an array of strings from JSON
    private Integer year;    // Expects a number or null from JSON

}
