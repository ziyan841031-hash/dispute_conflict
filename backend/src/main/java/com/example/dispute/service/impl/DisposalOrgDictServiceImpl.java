package com.example.dispute.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.dispute.entity.DisposalOrgDict;
import com.example.dispute.mapper.DisposalOrgDictMapper;
import com.example.dispute.service.DisposalOrgDictService;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 处置机构码表服务实现。
 */
@Service
public class DisposalOrgDictServiceImpl implements DisposalOrgDictService {

    private final DisposalOrgDictMapper disposalOrgDictMapper;

    public DisposalOrgDictServiceImpl(DisposalOrgDictMapper disposalOrgDictMapper) {
        this.disposalOrgDictMapper = disposalOrgDictMapper;
    }

    @Override
    public List<DisposalOrgDict> listAll() {
        return disposalOrgDictMapper.selectList(new LambdaQueryWrapper<DisposalOrgDict>()
                .orderByAsc(DisposalOrgDict::getOrgPhone));
    }
}
