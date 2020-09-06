import React, {useContext, useEffect, useState} from "react"
import { Context } from "../../context"
import Web3 from "web3"
import { BNB, getExplorerURL, getUniswapPriceEth, nodeAPI, SPARTA_ABI, SPARTA_ADDR, ROUTER_ABI,
    ROUTER_ADDR } from "../../client/web3"
import { convertFromWei, currency, getBN } from "../../common/utils"
import { calcShare } from "../../common/clpLogic"
import { Col, Input, Row, Select } from "antd"
import { LoadingOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { Button, Label, LabelGrey, Sublabel } from "../components"

export const StakeDialog = () => {

    const context = useContext(Context)

    const [account, setAccount] = useState(
        {
            address: '', spartaBalance: '', ethBalance: '',
            stakeUnits: '', SpartanStaked: '', assetStaked: '',
            SpartanShare: '', assetShare: '', roi: ''
        })

    const [connected, setConnected ] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        connect()
        // eslint-disable-next-line
    }, [])

    const connect = async () => {
        const accountConnected = (await window.web3.eth.getAccount())[0]
        if(accountConnected) {
            window.web3 = new Web3(window.ethereum)
            var accounts = await window.web3.eth.getAccount()
            const address = await accounts[0]
            await loadAccountData(address)
            setConnected(true)
            setLoading(false)
        }
    }

    const loadAccountData = async (account) => {
        const accountConnected = (await window.web3.eth.getAccount())[0]
        if (accountConnected) {
            const web3 = new Web3(new Web3.providers.HttpProvider(nodeAPI()))
            const contract = await new web3.eth.Contract(SPARTA_ABI(), SPARTA_ADDR())
            const ethBalance = convertFromWei(await web3.eth.getBalance(account))
            const spartaBalance = convertFromWei(await contract.methods.balanceOf(account).call())

            const poolContract = new web3.eth.Contract(ROUTER_ABI(), ROUTER_ADDR())
            let stakeData = await poolContract.methods.getMemberStakeData(account, BNB).call()

            let poolData = await poolContract.methods.poolData(BNB).call()
            let poolShare = calcShare(getBN(stakeData.stakeUnits), getBN(poolData.poolUnits), getBN(poolData.asset), getBN(poolData.Spartan))

            // let SpartanShare = await poolContract.methods.getStakerShareSpartan(account, BNB).call()
            // let assetShare = await poolContract.methods.getStakerShareAsset(account, BNB).call()
            let memberROI = await poolContract.methods.getMemberROI(account, BNB).call()
            console.log(memberROI)

            const accountData = {
                'address': account,
                'spartaBalance': spartaBalance,
                'ethBalance': ethBalance,
                'stakeUnits': (stakeData.stakeUnits / poolData.poolUnits) * 100,
                'SpartanStaked': convertFromWei(stakeData.Spartan),
                'assetStaked': convertFromWei(stakeData.asset),
                'SpartanShare': convertFromWei(poolShare.Spartan),
                'assetShare': convertFromWei(poolShare.asset),
                "roi": (+memberROI)
            }
            setAccount(accountData)
            context.setContext({ "accountData": accountData })
        }
    }

    return (
        <>
            <h2>ADD LIQUIDITY</h2>
            {loading &&
            <LoadingOutlined style={{ mnarginBottom: 0 }} />
            }
            {connected && !loading &&
            <AddLiquidityTable accountData={account}/>
            }
            {connected && !loading &&
            <>
                {account.stakeUnits > "0" &&
                <>
                    <hr />
                    <RemoveLiquidityTable accountData={account} />
                </>
                }
            </>
            }
        </>
    )
}

const AddLiquidityTable = (props) => {

    const account = props.accountData

    const totalSupply = getBN(1000000 * 10 ** 18)

    const assets = [
        {
            name: 'Spartan',
            symbol: '$SPARTA'
        },
        {
            name: 'Ether',
            symbol: 'Ξ'
        }
    ]

    const [asset0, setAsset0] = useState(null)
    const [amount0, setAmount0] = useState(0)

    const [asset1, setAsset1] = useState(null)
    const [amount1, setAmount1] = useState(0)

    const [stakeFlag, setStakeFlag] = useState(null)
    const [ethTx, setEthTx] = useState(null)
    const [SpartanPrice, setSpartanPrice] = useState(null)
    const [loading, setLoading] = useState(true)
    const [approved, setApproved] = useState(true)
    const [approveFlag, setApproveFlag] = useState(null)

    // const ethBalanceSpendable = (account.ethBalance - 0.1).toFixed(4) < 0 ?
    // 	0 : (account.ethBalance - 0.1).toFixed(4)

    const { Option } = Select

    useEffect(() => {
        connect()
        console.log(SpartanPrice)
        // eslint-disable-next-line
    }, [])

    const connect = async () => {
        const vethPrice = await getUniswapPriceEth()
        setSpartanPrice(vethPrice)
        const accountConnected = (await window.web3.eth.getAccount())[0]
        if (accountConnected) {
            const accounts = await window.web3.eth.getAccount()
            const address = accounts[0]
            checkApproval(address)
            setLoading(false)
        }
    }

    const checkApproval = async (address) => {
        const accountConnected = (await window.web3.eth.getAccount())[0]
        if (accountConnected){
            const SpartanContract = new window.web3.eth.Contract(SPARTA_ABI(), SPARTA_ADDR())
            const from = address
            const spender = ROUTER_ADDR()
            const approval = await SpartanContract.methods.allowance(from, spender).call()
            const spartaBalance = await SpartanContract.methods.balanceOf(address).call()
            if (+approval >= +spartaBalance && +spartaBalance >= 0) {
                setApproved(true)
            } else {
                setApproved(false)
            }
        }
    }

    const unlockToken = async () => {
        setApproveFlag(true)
        const tokenContract = new window.web3.eth.Contract(SPARTA_ABI(), SPARTA_ADDR())
        const fromAcc = account.address
        const spender = ROUTER_ADDR()
        const value = totalSupply.toString()
        await tokenContract.methods.approve(spender, value).send({ from: fromAcc })
        checkApproval(account.address)
    }

    const stake = async () => {
        const fromAcc = account.address
        let amountVeth
        let amountEth
        if (asset0.name === 'Spartan') {
            amountVeth = Web3.utils.toWei(amount0.toString())
            amountEth = Web3.utils.toWei(amount1.toString())
        } else {
            amountVeth = Web3.utils.toWei(amount1.toString())
            amountEth = Web3.utils.toWei(amount0.toString())
        }
        setStakeFlag(true)
        console.log(stakeFlag)
        const poolContract = new window.web3.eth.Contract(ROUTER_ABI(), ROUTER_ADDR())
        const tx = await poolContract.methods.stake(amountVeth, amountEth, BNB).send({
            value: amountEth,
            from: fromAcc,
            gasPrice: '',
            gas: ''
        })
        setEthTx(tx.transactionHash)
        console.log(ethTx)
    }

    const onAssetChange = (value) => {
        setAsset0(assets[value])
        addAnotherAsset(value)
    }

    const addAnotherAsset = (value) => {
        if(value === 0) {
            setAsset1(assets[1])
        } else {
            setAsset1(assets[0])
        }
    }

    const onAsset0amountChange = e => {
        setAmount0(e.target.value)
        console.log(amount0)
    }

    const onAsset1amountChange = e => {
        setAmount1(e.target.value)
        console.log(amount1)
    }

    return (
        <>
            <h2 style={{ fontStyle: 'italic' }}>Select asset to provide.</h2>
            <LabelGrey display={'block'} style={{ fontStyle: 'italic' }}>Select an asset you would like to provide. Spartan pool is non-proportional. Unlike Uniswap, where you need to provide<br/>
                an equal proportion of both assets, Spartan pools allow you to provide liquidity in unequal proportions.</LabelGrey>

            <Row style={{ marginBottom: '1.33rem' }}>
                <Col lg={4} xs={10}>
                    <Label display="block" style={{marginBottom: '0.55rem'}}>Asset</Label>
                    <Select size={'large'} placeholder="Select" onChange={onAssetChange} style={{ width: 135 }}>
                        {assets.map((asset, index) => {
                            return(
                                <Option value={index} key={index}>{asset.name}</Option>
                            )
                        })}
                    </Select>
                </Col>
                <Col lg={5} xs={9}>
                    <Label display="block" style={{marginBottom: '0.55rem'}}>Amount</Label>
                    {asset0
                        ? <Input size={'large'} style={{ marginBottom: 10 }} onChange={onAsset0amountChange} value={amount0} suffix={asset0.symbol}/>
                        : <Input size={'large'} style={{ marginBottom: 10 }} disabled/>
                    }
                </Col>
            </Row>

            {asset1 &&
            <>
                <h2 style={{ fontStyle: 'italic' }}>Would you like to stake {asset1.name} as well?</h2>
                <LabelGrey display={'block'} style={{ fontStyle: 'italic' }}>You may provide both assets in just one transaction, whilst this is not required.<br/>
                    If you don't want to add {asset1.name} just leave following amount at zero.</LabelGrey>
                <Row style={{ marginBottom: '1.33rem' }}>
                    <Col lg={4} xs={9}>
                        <Label display="block" style={{marginBottom: '0.55rem'}}>Amount</Label>
                        <Input size={'large'} style={{ marginBottom: 10 }} onChange={onAsset1amountChange} value={amount1} suffix={asset1.symbol}/>
                    </Col>
                </Row>

                {amount0 > 0
                    ? <Button backgroundColor="transparent" onClick={stake}>ADD >></Button>
                    : <Button backgroundColor="transparent" disabled>ADD >></Button>
                }
                <Sublabel>ADD LIQUIDITY TO THE POOL</Sublabel>
            </>
            }

            {!loading &&
            <>
                {!approved &&
                <Row>
                    <Col xs={24}>
                        <Label display="block" style={{marginBottom: '0.55rem'}}>Token Approval</Label>
                        <Button backgroundColor="transparent" onClick={unlockToken}>APPROVE >></Button>
                        <Sublabel>ALLOW Spartan FOR STAKING</Sublabel>
                        {approveFlag &&
                        <>
                            {!approved &&
                            <LoadingOutlined style={{ marginBottom: 0 }} />
                            }
                        </>
                        }
                    </Col>
                </Row>
                }

                {approved && account.stakeUnits > 0 &&
                <>
                    <hr/>
                    <h2>POOLED LIQUIDITY</h2>
                    <p>Assets you have pooled.</p>
                    <Row type="flex" justify="center" style={{ textAlign: "center", marginBottom: '2.66rem' }}>
                        <Col xs={8}>
                            <span style={{ fontSize: '0.8rem', display: 'block', margin: '0 0 0.5rem 0', color: '#97948e' }}>ASSET SHARE</span>
                            <span style={{ fontSize: '1.2rem', display: 'block', margin: '0' }}>{currency(account.SpartanShare, 0, 2, 'SPARTA')}</span>
                        </Col>
                        <Col xs={8}>
                            <span style={{ fontSize: '0.8rem', display: 'block', margin: '0 0 0.5rem 0', color: '#97948e' }}>ASSET SHARE</span>
                            <span style={{ fontSize: '1.2rem', display: 'block', margin: '0' }}>{currency(account.assetShare, 0, 5, 'BNB')}</span>
                        </Col>
                        <Col xs={8}>
                            <span style={{ fontSize: '0.8rem', display: 'block', margin: '0 0 0.5rem 0', color: '#97948e' }}>POOL SHARE</span>
                            <span style={{ fontSize: '1.2rem', display: 'block', margin: '0' }}>{account.stakeUnits}%</span>
                        </Col>
                    </Row>
                    <Row type="flex" justify="center" style={{ textAlign: "center" }}>
                        <Col xs={8}>
                            <span style={{ fontSize: '0.8rem', display: 'block', margin: '0 0 0.5rem 0', color: '#97948e' }}>STAKED</span>
                            <span style={{ fontSize: '1.2rem', display: 'block', margin: '0' }}>{currency(account.SpartanStaked, 0, 2, 'SPARTA')}</span>
                        </Col>
                        <Col xs={8}>
                            <span style={{ fontSize: '0.8rem', display: 'block', margin: '0 0 0.5rem 0', color: '#97948e' }}>STAKED</span>
                            <span style={{ fontSize: '1.2rem', display: 'block', margin: '0' }}>{currency(account.assetStaked, 0, 5, 'BNB')}</span>
                        </Col>
                        <Col xs={8}>
                            <span style={{ fontSize: '0.8rem', display: 'block', margin: '0 0 0.5rem 0', color: '#97948e' }}>ROI</span>
                            <span style={{ fontSize: '1.2rem', display: 'block', margin: '0' }}>{((account.roi/100) - 100)}%</span>
                        </Col>
                    </Row>
                </>
                }
            </>
            }
        </>
    )
}

const RemoveLiquidityTable = (props) => {

    const account = props.accountData

    const [burnTknFlag, setBurnTknFlag] = useState(null)
    const [tknTx, setTknTx] = useState(null)
    const [loaded2, setLoaded2] = useState(null)
    const [unstakeAmount, setUnstakeAmount] = useState('10000')

    useEffect(() => {
        console.log(account.stakeUnits)
        // eslint-disable-next-line
    }, [])

    const getLink = (tx) => {
        return getExplorerURL().concat('tx/').concat(tx)
    }

    const onAmountChange = e => {
        setUnstakeAmount(e.target.value * 100)
    }

    // const onUnitsChange = e => {
    // 	setUnstakeUnits(convertToWei(e.target.value))
    // }

    const unstake = async () => {
        setBurnTknFlag(true)
        const poolContract = new window.web3.eth.Contract(ROUTER_ABI(), ROUTER_ADDR())
        console.log(unstakeAmount, BNB)
        const tx = await poolContract.methods.unstake(unstakeAmount, BNB).send({ from: account.address })
        setTknTx(tx.transactionHash)
        setLoaded2(true)
    }

    // const unstakeExact = async () => {
    // 	setBurnTknFlag(true)
    // 	const poolContract = new window.web3.eth.Contract(ROUTER_ABI(), ROUTER_ADDR())
    // 	console.log(unstakeUnits, BNB)
    // 	const tx = await poolContract.methods.unstakeExact(unstakeUnits, BNB).send({ from: account.address })
    // 	setTknTx(tx.transactionHash)
    // 	setLoaded2(true)
    // }

    return (
        <>
            <h2>REMOVE LIQUIDITY</h2>
            <p>Remove your pooled assets.</p>
            {(account.stakeUnits > 0) &&
            <>
                <Row>
                    <Col xs={2}>
                        <Label display="block" style={{marginBottom: '0.55rem'}}>Proportion</Label>
                        <Input size={'large'} style={{ marginBottom: 10 }} onChange={onAmountChange} placeholder={100} suffix={'%'}/>
                    </Col>
                    <Col xs={12} sm={7} style={{ paddingLeft: 20, paddingTop: 30 }}>
                        {unstakeAmount > 0
                            ? <Button backgroundColor="transparent" onClick={unstake}>REMOVE >></Button>
                            : <Button backgroundColor="transparent" disabled>REMOVE >></Button>
                        }
                        <Sublabel margin={0}>REMOVE LIQUIDITY FROM THE POOL</Sublabel>
                        {burnTknFlag &&
                        <>
                            {!loaded2 &&
                            <LoadingOutlined style={{ marginLeft: 20, fontSize: 15 }} />
                            }
                            {loaded2 &&
                            <>
                                <a href={getLink(tknTx)} rel="noopener noreferrer" title="Transaction Link" target="_blank" style={{ color: "#C7692B", fontSize: 12 }}>VIEW TRANSACTION -></a>
                            </>
                            }
                        </>
                        }
                    </Col>
                </Row>
            </>
            }
        </>
    )
}

export const UpgradeDialog = () => {

    const context = useContext(Context)

    const [account, setAccount] = useState(
        {
            address: '', spartaBalance: '', ethBalance: '',
            stakeUnits: '', SpartanStaked: '', assetStaked: '',
            SpartanShare: '', assetShare: '', roi: ''
        })

    const [connected, setConnected ] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        connect()
        console.log(account)
        // eslint-disable-next-line
    }, [])

    const connect = async () => {
        const accountConnected = (await window.web3.eth.getAccount())[0]
        if(accountConnected) {
            window.web3 = new Web3(window.ethereum)
            var accounts = await window.web3.eth.getAccount()
            const address = await accounts[0]
            await loadAccountData(address)
            setConnected(true)
            setLoading(false)
        }
    }

    const loadAccountData = async (account) => {
        const accountConnected = (await window.web3.eth.getAccount())[0]
        if (accountConnected) {
            const web3 = new Web3(new Web3.providers.HttpProvider(nodeAPI()))
            const contract = await new web3.eth.Contract(SPARTA_ABI(), SPARTA_ADDR())
            const ethBalance = convertFromWei(await web3.eth.getBalance(account))
            const spartaBalance = convertFromWei(await contract.methods.balanceOf(account).call())

            const poolContract = new web3.eth.Contract(ROUTER_ABI(), ROUTER_ADDR())
            let stakeData = await poolContract.methods.getMemberStakeData(account, BNB).call()

            let poolData = await poolContract.methods.poolData(BNB).call()
            let poolShare = calcShare(getBN(stakeData.stakeUnits), getBN(poolData.poolUnits), getBN(poolData.asset), getBN(poolData.Spartan))

            // let SpartanShare = await poolContract.methods.getStakerShareSpartan(account, BNB).call()
            // let assetShare = await poolContract.methods.getStakerShareAsset(account, BNB).call()
            let memberROI = await poolContract.methods.getMemberROI(account, BNB).call()
            console.log(memberROI)

            const accountData = {
                'address': account,
                'spartaBalance': spartaBalance,
                'ethBalance': ethBalance,
                'stakeUnits': (stakeData.stakeUnits / poolData.poolUnits) * 100,
                'SpartanStaked': convertFromWei(stakeData.Spartan),
                'assetStaked': convertFromWei(stakeData.asset),
                'SpartanShare': convertFromWei(poolShare.Spartan),
                'assetShare': convertFromWei(poolShare.asset),
                "roi": (+memberROI)
            }
            setAccount(accountData)
            context.setContext({ "accountData": accountData })
        }
    }

    const upgrade = async () => {
        const poolContract = new window.web3.eth.Contract(ROUTER_ABI(), ROUTER_ADDR())
        await poolContract.methods.upgrade(ROUTER_ADDR()).send({ from: account.address })
    }

    return (
        <>
            <h2>UPGRADE TO BETA 2</h2>
            <p>Move your liquidity from the beta V1 pool.</p>
            {loading &&
                <LoadingOutlined style={{ mnarginBottom: 0 }} />
            }
            {connected && !loading &&
                <>
                    {account.stakeUnits > "0" &&
                        <>
                            <Button backgroundColor="transparent" onClick={upgrade}>UPGRADE >></Button>
                            <Sublabel>MOVE ALL YOUR LIQUIDITY</Sublabel>
                        </>
                    }
                    {!account.stakeUnits > "0" &&
                        <>
                            <LabelGrey display={'block'} style={{ fontStyle: 'italic' }}>
                                <CheckCircleOutlined style={{ marginBottom: '0' }}/>&nbsp;You've got nothing to upgrade.
                            </LabelGrey>
                        </>
                    }
                </>
            }
        </>
    )
}