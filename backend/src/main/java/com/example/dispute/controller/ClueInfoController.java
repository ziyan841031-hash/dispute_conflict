package com.example.dispute.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.dispute.dto.ApiResponse;
import com.example.dispute.entity.ClueInfo;
import com.example.dispute.mapper.ClueInfoMapper;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/clues")
public class ClueInfoController {

    private final ClueInfoMapper clueInfoMapper;

    public ClueInfoController(ClueInfoMapper clueInfoMapper) {
        this.clueInfoMapper = clueInfoMapper;
    }

    @GetMapping
    public ApiResponse<List<ClueInfo>> list(@RequestParam(value = "district", required = false) String district,
                                            @RequestParam(value = "streetTown", required = false) String streetTown,
                                            @RequestParam(value = "status", required = false) String status,
                                            @RequestParam(value = "keyword", required = false) String keyword) {
        LambdaQueryWrapper<ClueInfo> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByDesc(ClueInfo::getClueTime).orderByDesc(ClueInfo::getId);

        if (StringUtils.hasText(district)) {
            wrapper.like(ClueInfo::getDistrict, district.trim());
        }
        if (StringUtils.hasText(streetTown)) {
            wrapper.like(ClueInfo::getStreetTown, streetTown.trim());
        }
        String normalizedStatus = normalizeStatus(status);
        if (normalizedStatus != null) {
            wrapper.eq(ClueInfo::getStatus, normalizedStatus);
        }
        if (StringUtils.hasText(keyword)) {
            String trimmed = keyword.trim();
            wrapper.and(q -> q.like(ClueInfo::getClue, trimmed)
                    .or()
                    .like(ClueInfo::getClueInterpretation, trimmed)
                    .or()
                    .like(ClueInfo::getClueSource, trimmed));
        }
        return ApiResponse.success(clueInfoMapper.selectList(wrapper));
    }

    @GetMapping("/{id}")
    public ApiResponse<ClueInfo> detail(@PathVariable("id") Long id) {
        ClueInfo record = clueInfoMapper.selectById(id);
        if (record == null) {
            return ApiResponse.fail("记录不存在");
        }
        return ApiResponse.success(record);
    }

    @PostMapping
    public ApiResponse<ClueInfo> create(@RequestBody ClueInfo clueInfo) {
        if (!isValid(clueInfo)) {
            return ApiResponse.fail("区、街道、线索、时间、状态不能为空");
        }
        LocalDateTime now = LocalDateTime.now();
        clueInfo.setId(null);
        clueInfo.setStatus(normalizeStatus(clueInfo.getStatus()));
        if (clueInfo.getCreatedAt() == null) {
            clueInfo.setCreatedAt(now);
        }
        clueInfo.setUpdatedAt(now);
        clueInfoMapper.insert(clueInfo);
        return ApiResponse.success(clueInfo);
    }

    @PutMapping("/{id}")
    public ApiResponse<ClueInfo> update(@PathVariable("id") Long id, @RequestBody ClueInfo clueInfo) {
        ClueInfo existing = clueInfoMapper.selectById(id);
        if (existing == null) {
            return ApiResponse.fail("记录不存在");
        }
        if (!isValid(clueInfo)) {
            return ApiResponse.fail("区、街道、线索、时间、状态不能为空");
        }
        clueInfo.setId(id);
        clueInfo.setStatus(normalizeStatus(clueInfo.getStatus()));
        clueInfo.setCreatedAt(existing.getCreatedAt());
        clueInfo.setUpdatedAt(LocalDateTime.now());
        clueInfoMapper.updateById(clueInfo);
        return ApiResponse.success(clueInfoMapper.selectById(id));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> delete(@PathVariable("id") Long id) {
        ClueInfo existing = clueInfoMapper.selectById(id);
        if (existing == null) {
            return ApiResponse.fail("记录不存在");
        }
        clueInfoMapper.deleteById(id);
        return ApiResponse.success(Boolean.TRUE);
    }

    private boolean isValid(ClueInfo clueInfo) {
        return clueInfo != null
                && StringUtils.hasText(clueInfo.getDistrict())
                && StringUtils.hasText(clueInfo.getStreetTown())
                && StringUtils.hasText(clueInfo.getClue())
                && clueInfo.getClueTime() != null
                && normalizeStatus(clueInfo.getStatus()) != null;
    }

    private String normalizeStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return null;
        }
        String value = status.trim();
        if ("1".equals(value) || "正常".equals(value)) {
            return "1";
        }
        if ("2".equals(value) || "关闭".equals(value)) {
            return "2";
        }
        return null;
    }
}
